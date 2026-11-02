# BullMQ Background Job Processing

Production-oriented background job processing for the reusable MERN
backend starter.

This document explains **what we implemented, why each part is needed,
how the pieces work together, the challenges encountered, and how those
challenges were addressed**.

> **Scope:** This README documents the BullMQ work in the backend.
> Prometheus, Grafana, cAdvisor, Alertmanager, and Mailtrap monitoring
> configuration are separate concerns and are not documented as BullMQ
> implementation details here.

------------------------------------------------------------------------

## 1. Why We Needed a Background Job Queue

Some backend operations should not run as part of the user's HTTP
request.

For example, when a user registers or requests a password reset, the API
may need to send an email. If the API sends that email synchronously,
the request must wait for the email provider/network operation to
finish.

This can cause:

-   Slower API responses.
-   Requests being affected by temporary email-provider delays or
    outages.
-   Web requests spending time on work that does not need to happen
    before responding.
-   Difficulty retrying failed work reliably.
-   Difficulty controlling how quickly jobs are sent to an external
    provider.

A background queue separates **accepting the request** from **performing
the time-consuming work**.

### Synchronous vs. background processing

**Without a queue:**

1.  Client sends an API request.
2.  Backend performs the business operation.
3.  Backend sends the email and waits.
4.  Backend sends the HTTP response.

**With BullMQ:**

1.  Client sends an API request.
2.  Backend performs the required business operation.
3.  Backend adds an email job to Redis through BullMQ.
4.  Backend can respond without waiting for the email to be sent.
5.  A separate worker consumes the job and sends the email.

The API and worker have different responsibilities:

-   **API process:** creates/enqueues jobs.
-   **Worker process:** consumes jobs and executes the work.
-   **Redis:** stores queue/job state used by BullMQ.

This improves request responsiveness and gives background work retry,
concurrency, and rate-control capabilities.

------------------------------------------------------------------------

## 2. Technologies Used

  Technology                            Responsibility
  ------------------------------------- ------------------------------------------------
  Node.js                               Runtime for the API and worker
  BullMQ                                Queue and background-job processing
  Redis                                 Queue storage and coordination
  ioredis                               Redis client used by the BullMQ implementation
  Nodemailer / existing email utility   Performs email delivery
  Docker Compose                        Runs the backend, Redis, and worker services

The project uses **CommonJS** (`require`) and the existing backend
structure.

------------------------------------------------------------------------

## 3. High-Level Architecture

``` text
                  HTTP request
                       |
                       v
                Express backend
                       |
                 Add email job
                       |
                       v
                 BullMQ Queue
                       |
                       v
                     Redis
                       |
                 Worker process
                       |
                 Process the job
                       |
                       v
               Existing sendEmail()
                       |
                       v
                 Email provider
```

The API does not need to wait for the worker to finish sending the
email.

### Queue and worker responsibilities

**Queue** - Accepts jobs from the backend. - Stores job information
through Redis. - Makes jobs available for workers.

**Worker** - Retrieves available jobs. - Executes the job processor. -
Marks successful jobs as completed. - Handles errors and lets BullMQ
apply configured retry behavior.

**Redis** - Persists the queue's operational data according to the Redis
deployment/configuration. - Coordinates job state between queue
producers and worker processes.

------------------------------------------------------------------------

## 4. What We Implemented

### 4.1 Redis connection for BullMQ

We created a BullMQ-compatible Redis connection using `ioredis`.

The connection uses:

``` js
const connection = new IORedis(env.redisUrl, {
  maxRetriesPerRequest: null,
});
```

**Why `maxRetriesPerRequest: null`?**

BullMQ workers need a Redis connection that can remain available while
waiting for jobs. BullMQ's Redis connection requirements differ from a
typical short-lived request/response Redis operation. This option is
used for the BullMQ connection so ioredis does not apply a finite
per-request retry limit.

**Why this matters:** - BullMQ can maintain its worker connection. -
Queue and worker processes can communicate through Redis. - The
application uses the configured Redis URL rather than hardcoding
connection details.

Keep the BullMQ connection separate from ordinary cache-oriented Redis
usage where their connection requirements differ.

### 4.2 Email queue

We implemented an email queue using BullMQ's `Queue`.

The queue is named:

``` text
email
```

The job name used for email work is:

``` text
send-email
```

The backend adds email work to the queue rather than performing the
complete email delivery operation inside the HTTP request.

**Why we needed it:** - Email delivery can be slow or temporarily
unavailable. - Email work can be retried independently. - API request
handling is not tied to the duration of email delivery. - The same queue
can be processed by one or more worker processes.

### 4.3 Email worker

A separate BullMQ `Worker` consumes jobs from the `email` queue.

The worker calls the existing email utility (`sendEmail`) to perform the
actual email delivery.

This keeps responsibilities separated:

-   Queue code manages background-job scheduling.
-   Worker code manages job execution.
-   The email utility manages email delivery.

**Why a separate worker?**

The API should not have to execute every background task itself. A
worker can process jobs independently, and worker capacity can be
increased without changing the API's request-handling responsibilities.

### 4.4 Retry with exponential backoff

Email jobs were configured with:

``` js
{
  attempts: 3,
  backoff: {
    type: "exponential",
    delay: 3000,
  },
}
```

This means BullMQ can make up to three processing attempts, with
exponential backoff beginning at a delay of 3 seconds.

Conceptually, the retry delay increases between attempts rather than
retrying continuously at the same short interval.

**Why retries are useful:**

Temporary failures can happen because of: - Network interruptions. -
Temporary email-provider unavailability. - Connection timeouts. -
Temporary service errors.

Retries give transient failures another opportunity to succeed without
requiring a user to submit the original request again.

**Important:** Retries do not guarantee successful delivery. Permanent
errors can still fail after all attempts. Email job processors should
also be designed with duplicate-delivery risk in mind. A retry can
repeat an operation if the provider accepted the email but the worker
did not receive a successful response.

### 4.5 Job priority

We implemented job priorities so that jobs can be assigned different
levels of importance.

Priority allows BullMQ to choose higher-priority waiting jobs ahead of
lower-priority waiting jobs.

**Why priority is useful:**

For example, a password-reset email may need to be processed ahead of a
low-priority bulk notification.

**Important limitation:** Priority affects the order in which waiting
jobs are selected. It does not interrupt a job that a worker is already
processing.

### 4.6 Worker concurrency

The worker was configured to process multiple jobs concurrently, with a
concurrency value of **5 per worker process**.

**Why concurrency is useful:**

-   A worker does not have to wait for one I/O-bound email operation to
    finish before starting every other job.
-   Multiple jobs can be processed at the same time.
-   Worker throughput can improve for I/O-bound work.

Concurrency should be chosen based on the job workload and the
capacity/rate limits of the external service. More concurrency is not
automatically better.

### 4.7 Global queue rate limiting

We configured a BullMQ queue rate limiter:

``` js
{
  max: 5,
  duration: 10000,
}
```

This limits processing to **5 jobs per 10-second interval** across
workers for the configured queue limiter.

**Why rate limiting is useful:**

-   Helps avoid sending requests to an email provider too quickly.
-   Reduces the risk of exceeding provider rate limits.
-   Controls bursts when many jobs arrive together.
-   Helps protect downstream services.

This is different from worker concurrency:

  Feature        Controls
  -------------- -----------------------------------------------------
  Concurrency    How many jobs a worker can process simultaneously
  Rate limiter   How many jobs can be processed within a time window

A worker can have concurrency 5 while the queue has a global rate limit
of 5 jobs per 10 seconds. These settings solve different problems.

### 4.8 Multiple worker replicas with Docker Compose

The production Docker Compose setup includes a separate worker service.
We tested scaling it to two replicas.

The command used was:

``` bash
docker compose \
  -f docker/production/compose.yaml \
  up -d --scale worker=2
```

The worker service must not define a fixed `container_name`, because
multiple replicas need distinct container names.

**Why multiple replicas are useful:**

-   More worker processes can consume jobs.
-   Background-processing capacity can be scaled separately from the
    API.
-   A worker process can be replaced without changing the API service.
-   Multiple workers can share the same BullMQ queue through Redis.

In our configuration, each worker has concurrency 5. Two worker replicas
therefore provide up to 10 worker concurrency slots in total, subject to
the queue's global rate limiter and available resources.

**Important:** Scaling worker replicas does not override the global
queue rate limiter. With the configured limit of 5 jobs per 10 seconds,
adding workers does not automatically increase the permitted queue
processing rate beyond that limit.

### 4.9 Graceful shutdown

We integrated queue shutdown into the backend's existing
graceful-shutdown flow.

The shutdown flow closes resources in an orderly manner:

1.  Stop accepting new HTTP requests and close the HTTP server.
2.  Close the BullMQ queue connection/resource.
3.  Close the MongoDB connection.

The queue close function is retained and invoked during shutdown.

**Why graceful shutdown is needed:**

Containers and processes are stopped during deployments, restarts,
scaling, and machine maintenance. Abruptly terminating processes can
interrupt in-progress work or leave resources open.

Graceful shutdown allows the application to close its resources cleanly.
The worker process should also have an appropriate shutdown path so it
can stop accepting new jobs and finish or safely hand off active work
according to BullMQ's shutdown behavior.

------------------------------------------------------------------------

## 5. Challenges We Faced and How We Addressed Them

This section records the implementation decisions and issues discussed
during our work. It does not assume that every possible BullMQ
production concern was tested.

### Challenge 1: Understanding why a queue was needed

**Problem:** Sending email directly from an API request couples request
latency to email delivery.

**Solution:** We introduced a BullMQ email queue. The backend enqueues
work, and a separate worker performs delivery.

**What we gained:** Separation of request handling from background
processing, along with retries and controlled job processing.

### Challenge 2: Configuring Redis for BullMQ

**Problem:** A Redis connection used for ordinary application operations
is not necessarily configured appropriately for BullMQ workers.

**Solution:** We used an ioredis connection for BullMQ with
`maxRetriesPerRequest: null`.

**What we gained:** A Redis connection configured for BullMQ's worker
requirements.

### Challenge 3: Handling temporary email failures

**Problem:** Email delivery can fail temporarily because of network or
provider issues.

**Solution:** We configured three attempts with exponential backoff
starting at 3 seconds.

**What we gained:** Temporary failures can be retried automatically
instead of immediately abandoning the job.

### Challenge 4: Preventing too many simultaneous jobs

**Problem:** Processing too many jobs at once can put pressure on the
email provider or other resources.

**Solution:** We configured worker concurrency to 5.

**What we gained:** A controlled number of jobs can be processed
simultaneously by each worker.

### Challenge 5: Preventing excessive job throughput

**Problem:** Concurrency alone does not limit how many jobs are
processed over a period of time. A fast worker could still send requests
too frequently.

**Solution:** We configured the BullMQ rate limiter to 5 jobs per 10
seconds.

**What we gained:** A queue-level processing-rate control, separate from
concurrency.

### Challenge 6: Scaling workers

**Problem:** Running background processing inside the API process makes
it harder to scale API traffic and background work independently.

**Solution:** We separated the worker into its own Docker Compose
service and tested two replicas using `--scale worker=2`.

**What we gained:** Worker capacity can be scaled independently, without
adding a new top-level backend source folder.

### Challenge 7: Worker replicas and container naming

**Problem:** A fixed Docker `container_name` prevents Compose from
creating multiple replicas of the same service.

**Solution:** The worker service is scaled without assigning it a fixed
container name.

**What we gained:** Compose can create distinct worker containers from
the same service definition.

### Challenge 8: Closing queue resources during shutdown

**Problem:** Background-processing resources should not be abandoned
when the backend shuts down.

**Solution:** We added queue closure to the existing graceful-shutdown
sequence.

**What we gained:** More orderly application shutdown and resource
cleanup.

### Challenge 9: Distinguishing concurrency from rate limiting

**Problem:** These two settings can sound similar, but they control
different things.

**Solution:** We configured both independently: - Concurrency: 5 jobs
per worker process. - Rate limit: 5 jobs per 10 seconds for the queue.

**What we gained:** Better control over simultaneous work and processing
frequency.

### Challenge 10: Verifying failed-job behavior

**Problem:** A configured retry mechanism should be verified rather than
assumed to work.

**Solution:** We intentionally created failed jobs and observed the
failed-job metric and alerting behavior during monitoring verification.

**What we gained:** We confirmed that failed jobs were retained and that
the monitoring system could detect a failed-job count above the
configured threshold.

**Scope note:** The monitoring alert test confirmed detection and
notification of retained failed jobs. It does not, by itself, prove
every retry scenario or guarantee email-provider delivery semantics.

------------------------------------------------------------------------

## 6. BullMQ Configuration Summary

The following table summarizes the values used in our implementation.

  --------------------------------------------------------------------------
  Setting                            Implemented value Purpose
  --------------------- ------------------------------ ---------------------
  Queue name                                   `email` Groups email
                                                       background jobs

  Job name                                `send-email` Identifies the
                                                       email-processing job

  Attempts                                         `3` Maximum configured
                                                       processing attempts

  Backoff type                           `exponential` Increases retry delay
                                                       between attempts

  Backoff delay                              `3000 ms` Initial backoff delay

  Worker concurrency                    `5` per worker Limits simultaneous
                                                       jobs per worker

  Worker replicas                                  `2` Adds independent
  tested                                               worker processes

  Queue rate limit             `5` jobs per `10000 ms` Controls queue
                                                       processing rate

  Redis client                               `ioredis` BullMQ Redis
                                                       connection

  Retry request setting   `maxRetriesPerRequest: null` BullMQ-compatible
                                                       worker connection
                                                       behavior
  --------------------------------------------------------------------------

------------------------------------------------------------------------

## 7. How the Implementation Helps in a Real Project

Consider a user requesting a password-reset email.

1.  The client sends a password-reset request.
2.  The backend validates the request and performs the relevant business
    logic.
3.  The backend adds an email job to the `email` queue.
4.  The API responds without waiting for the email provider to finish
    sending.
5.  A worker retrieves the job from Redis.
6.  The worker calls the email utility.
7.  If processing fails, BullMQ applies the configured retry policy.
8.  If the job still fails after the configured attempts, it is retained
    as a failed job according to the queue's retention behavior.

The same architecture can be extended to other background tasks, such
as: - Sending account notifications. - Generating reports. - Processing
uploaded files. - Sending bulk notifications. - Performing scheduled or
delayed work.

These are possible extensions, not all features implemented in this
project.

------------------------------------------------------------------------

## 8. Important Production Considerations

The implementation provides a useful foundation, but a production queue
also needs operational decisions.

### 8.1 Idempotency and duplicate side effects

A job can be retried. Design processors so that repeating a job does not
unintentionally create duplicate side effects.

For email, consider whether a repeated send is acceptable and whether an
application-level idempotency key or delivery record is needed.

### 8.2 Failed-job retention and cleanup

Failed jobs can remain in Redis. Define appropriate retention and
cleanup policies so old jobs do not grow without bound.

Do not indiscriminately clear production queues. Identify the jobs to
remove and preserve jobs that are still needed for investigation or
retry.

### 8.3 Monitoring

Useful queue metrics include: - Waiting jobs. - Active jobs. - Failed
jobs. - Completed jobs. - Queue processing duration and throughput.

In this project, BullMQ metrics were exposed to Prometheus and alert
rules were added for queue backlog, failed jobs, worker saturation, and
metric availability. Alertmanager email delivery was tested separately.

### 8.4 Worker capacity and downstream limits

Increasing worker replicas or concurrency does not necessarily increase
useful throughput. Consider: - Redis capacity. - CPU and memory
limits. - Email-provider rate limits. - Queue rate limiter. - Job
processing duration. - Retry volume.

### 8.5 Redis availability and persistence

Redis is a critical dependency for BullMQ. Production Redis
configuration, persistence, backups, memory limits, and recovery
procedures should be reviewed against the application's durability
requirements.

### 8.6 Graceful deployment and shutdown

Ensure worker shutdown is handled intentionally during deployment. Test
how active jobs behave when a worker is stopped, and verify that jobs
can be processed safely by another worker when appropriate.

------------------------------------------------------------------------

## 9. Useful Docker Commands

Run these from the `server` directory.

### Start production services

``` bash
docker compose -f docker/production/compose.yaml up -d
```

### Scale to two worker replicas

``` bash
docker compose -f docker/production/compose.yaml up -d --scale worker=2
```

### List production services

``` bash
docker compose -f docker/production/compose.yaml ps
```

### View worker logs

``` bash
docker compose -f docker/production/compose.yaml logs -f worker
```

### View Redis logs

``` bash
docker compose -f docker/production/compose.yaml logs -f redis
```

### View backend logs

``` bash
docker compose -f docker/production/compose.yaml logs -f backend
```

Use the same `--env-file` option as your normal production command if
your Compose configuration requires it.

------------------------------------------------------------------------

## 10. Interview Preparation: Questions to Be Able to Explain

1.  Why do we need a message queue in a backend application?
2.  What is BullMQ, and how does it use Redis?
3.  What is the difference between a queue and a worker?
4.  What happens when a job processor throws an error?
5.  What is the difference between fixed and exponential backoff?
6.  Why should background jobs have a retry policy?
7.  What is worker concurrency?
8.  What is queue rate limiting?
9.  What is the difference between concurrency and rate limiting?
10. How does job priority work?
11. Does priority interrupt an already active job?
12. Why should workers run separately from the API process?
13. How can Docker Compose scale worker replicas?
14. Why should a scalable Compose service avoid a fixed container name?
15. Why is graceful shutdown important for workers?
16. What is an idempotent job processor, and why does it matter?
17. Why should failed jobs have a retention and cleanup policy?
18. What happens if Redis becomes unavailable?
19. Does adding more workers always increase throughput?
20. How would you monitor queue backlog and failed jobs?

------------------------------------------------------------------------

## 11. Final Summary

We implemented a Redis-backed BullMQ email-processing system with a
separate worker process, retries using exponential backoff, job
priority, worker concurrency, queue-level rate limiting, Docker-based
worker scaling, and graceful shutdown integration.

The key architectural improvement is that **the API enqueues background
work while independent workers execute it**. This keeps request handling
separate from slower external operations and gives the backend more
control over retries, processing capacity, and job throughput.

The implementation was also connected to the project's monitoring stack
so queue-related metrics and failed-job conditions could be observed and
alerted on.

This is the BullMQ implementation record for the reusable MERN backend
starter. Update this document when queue names, retry settings, worker
configuration, or deployment behavior change.
