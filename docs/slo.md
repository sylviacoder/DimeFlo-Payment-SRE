# SLOs for DimeFlo transfers - app 02581

## Availability 

Availability target for app 02581 is 99.9%. Given that it is achieveable with one database and leaves about 43 minutes a month of error budget for release and possible failovers, it is also strict enough for payment.

## Latency 

For the latency SLO for app 02581, 99% of incoming requests for transfers should be completed in under 300ms, measured over the period of 30 days (1 month). The decision behind 300ms was because this feels instant to the users, and are less likely to hit the send button twice and cause a duplicate transaction.

It is also achieveable with a single database. I set it at 99% rather than 100% because a little number of slow requests is expected and normal, chasing every single one is not worth the cost.

## Correctness 

Correctness SLO for app 02581: For every payment to be applied exactly once, no double charges and zero duplicate transfers. Contrary to latency and availability, there is no error budget in correctness SLO.

A duplicate transfer essentially means that a customer loses money, so any and every duplicate transfer is treated as a serious incident. It is to be measured by checking the app database for transfers with the same client reference.
