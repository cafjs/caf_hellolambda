# CAF (Cloud Assistant Framework)

Co-design permanent, active, stateful, reliable cloud proxies with your web app.

See http://www.cafjs.com 

## CAF IoT example of using AWS Lambda to invoke CA methods

AWS Lambda (or Google/Microsoft functions) complements very well the capabilities of CAF. In Lambda, functions are stateless and concurrent, making it difficult to implement reliable state machines, which are needed to safely perform actions in the external world. However, Lambda functions can be attached to many services, making it easy to provide push mechanisms that notify when things change.

Combining CAF with Lambda you get the best of both worlds. CAs don't need to poll because Lambda functions notify them when things change. Similarly, it becomes trivial to implement complex stateful logic within a CA because of message processing serialization, transparent checkpointing, and transactional execution semantics.

This example requires some initial setup of the Lambda function that needs to be done manually (see http://aws.amazon.com/documentation/lambda/ for details). Typically, the Lambda function is linked to changes on  an S3 bucket, and this allows to control devices by writing to it.



