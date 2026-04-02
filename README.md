James French Photography Website

using React and AWS Amplify

.env file for script usage:

TIMESLOT_TABLE_NAME_PROD='insertnamehere';
TIMESLOT_TABLE_NAME='insertnamehere'
TIMESLOT_TAG_TABLE_NAME_PROD='insertnamehere'
TIMESLOT_TAG_TABLE_NAME='insertnamehere'
PHOTOPATH_TABLE_NAME_PROD='insertnamehere'
PHOTOPATH_TABLE_NAME='insertnamehere'
TAGS_TABLE_NAME_PROD='insertnamehere'
TAGS_TABLE_NAME='insertnamehere'
PARTICIPANT_TABLE_NAME_PROD='insertnamehere'
PARTICIPANT_TABLE_NAME='insertnamehere'
S3BUCKET_PROD='insertnamehere'
S3BUCKET='insertnamehere'

executing migration scripts:
user$ AWS_PROFILE={profile} npx tsx {script}

logging into gcp:
gcloud auth application-default login

logging into aws
aws sso login