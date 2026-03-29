curl -X POST https://api-m.sandbox.paypal.com/v1/customer/wallet-domains \
  -H "Authorization: Bearer <your_access_token>" \
  -H "PayPal-Auth-Assertion: <your_auth_assertion>" \
  -H "Content-Type: application/json" \
  -d '{
    "provider_type": "APPLE_PAY",
    "domain": {
      "name": "<domain>"
    }
  }'