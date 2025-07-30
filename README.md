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
