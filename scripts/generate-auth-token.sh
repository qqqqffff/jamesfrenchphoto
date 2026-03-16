curl -X POST 'https://api-m.sandbox.paypal.com/v1/oauth2/token' \
-u 'clientId:clientSecret' \
-H 'Content-Type: application/x-www-form-urlencoded' \
-d 'grant_type=client_credentials' \
-d 'response_type=id_token'