# CDK for S3ToRDS Project
Link to Github Repository for API of S3ToRDS project: [Link](https://github.com/vanshul02/api-s3-to-rds)

## Requirements
- Node.js
- AWS CLI

## Steps
- Make sure that your AWS CLI is set up and configured or you can use: 
```bash
aws config
```
- Clone the project using:
```bash
git clone https://github.com/vanshul02/cdk-s3-to-rds.git
```
- In project directory run:
```
npm install --save-exact
```
- Now we need to bootstrap the cdk directory with your aws cli so run:
```bash
cdk bootstrap
```
- Finally to deploy the Lambda Function, S3 Bucket and RDS Instance use:
```bash
cdk deploy
```
