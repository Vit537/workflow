Run gcloud run deploy spring-service \
API [run.googleapis.com] not enabled on project [***]. Would 
you like to enable and retry (this will take a few minutes)? (y/N)?  
ERROR: (gcloud.run.deploy) PERMISSION_DENIED: Cloud Run Admin API has not been used in project *** before or it is disabled. Enable it by visiting https://console.developers.google.com/apis/api/run.googleapis.com/overview?project=*** then retry. If you enabled this API recently, wait a few minutes for the action to propagate to our systems and retry. This command is authenticated as workflow-github-actions@***.iam.gserviceaccount.com using the credentials in /home/runner/work/workflow/workflow/gha-creds-1e2c01b154905747.json, specified by the [auth/credential_file_override] property.
Cloud Run Admin API has not been used in project *** before or it is disabled. Enable it by visiting https://console.developers.google.com/apis/api/run.googleapis.com/overview?project=*** then retry. If you enabled this API recently, wait a few minutes for the action to propagate to our systems and retry.
Google developers console API activation
https://console.developers.google.com/apis/api/run.googleapis.com/overview?project=***
- '@type': type.googleapis.com/google.rpc.ErrorInfo
  domain: googleapis.com
  metadata:
    activationUrl: https://console.developers.google.com/apis/api/run.googleapis.com/overview?project=***
    consumer: projects/***
    containerInfo: ***
    service: run.googleapis.com
    serviceTitle: Cloud Run Admin API
  reason: SERVICE_DISABLED