Production level devops, docker, elastic beanstalk, nginx, express, postgres, redis, react. Simple frontend functionality.

Dockerrun.aws.json, define container definintions ---> Amazon EB

Elastic beanstalk calls elastic container service (ECS) and handles task definintions.

Task definition docs:
https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definitions.html
look for the parameters to set the definintions
One container must be marked as essential in the aws.json file

port mapping ---> setting the container port to expose the application to the outside

What is Port Mapping?
When running a Docker container, the container itself is isolated from your host machine. By default, services started inside the container are only accessible inside that container. If you want to connect to those services from outside Docker (e.g., in a browser or using a tool on your laptop), you need to map a port on the host to a port inside the container.

hostPort:containerPort
ports:
 -'3050:80'

 more explict mapping is required w/ AWS configs

 AWS Configs to subout redis w/ elastic cache and postgres w/ RDS
 advantages:
    redis: --> production grade
        redis is created and maintained, easy to scale, built in logs maintenance,
        secure, EB migration
    postgres:
        instance is created and maintained, scalable, built in logging/maintainence,
        secure, automated backups, EB migration

A new security group needs to be created and configured to allow for EB, RDS and EC(Redis) to commuincate

Project Deployment and Debugging Summary
This multi-container application is deployed on AWS Elastic Beanstalk using Docker Compose. The architecture consists of an Nginx proxy routing traffic to a React frontend and a Node.js Express backend API, which communicates with a background worker via an external AWS ElastiCache (Redis) instance and stores data in an external AWS RDS (Postgres) database. The initial deployment faced significant challenges with container communication, primarily manifesting as 502 Bad Gateway errors from Nginx. The first phase of debugging focused on correcting the internal Docker networking by building a custom Nginx image. This involved properly structuring the Nginx configuration to use Docker's internal DNS resolver (resolver 127.0.0.11;), which was crucial for allowing the Nginx proxy to dynamically find and connect to the API container even as its internal IP address changed.

Once internal proxying was stable, the primary obstacle became the network connectivity between the Elastic Beanstalk application and the external AWS data services. The application logs consistently showed ConnectionTimeoutError and ETIMEDOUT errors when attempting to reach the RDS and ElastiCache endpoints. This was identified as a classic AWS networking issue caused by misconfigured Security Groups, which act as stateful firewalls. The solution required establishing a correct, secure communication path by using three separate security groups: one for the Elastic Beanstalk instances (the App), one for the RDS instance (the DB), and one for the ElastiCache instance (the Cache). The fix involved adding specific inbound rules to the DB and Cache security groups that explicitly allowed traffic on their respective ports (5432 for Postgres, 6379 for Redis) only from the App's security group ID. This ensured that only the application servers could communicate with the data services, adhering to the principle of least privilege.

With the network paths open, a final application-level issue was revealed. The server and worker were still failing to connect to Redis, but this time without a timeout. Detailed logging added to the Node.js startup sequence pinpointed the failure to the Redis client connection attempt. The root cause was discovered to be a mismatch in connection security: AWS ElastiCache had in-transit encryption enabled by default, requiring a secure TLS connection. The application, however, was attempting an unencrypted connection. The final fix was a one-line code change in both the server and worker to update the connection string protocol from redis:// to the secure rediss://. This allowed the clients to establish a TLS connection, successfully bringing the entire application stack online and resolving all errors.

Imperative Appraoch vs Declartive Approach 
Maintaining the "master list/task schedule" There SHOULD be 3 containers using multi worker. -> There should be 5 containers using multiworker ->
There should be 4 containers using  multworker -> There shoulder be 4 containers using multiworker networked to mutliredis -> There should be 4 containers using mutli worker using v1.23 networked to multi redis. Declartive is the industry standard.



