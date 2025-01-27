# RideNITT TC

Please checkout `prisma/schema.prisma`

# API Endpoints

`/auth/send-otp` POST user enters phone number

`/auth/verify-otp` POST user enters otp and jwt is attached as cookie (web app right)

`/api/autocomplete` Give `?q=Main`, it gives Graphhopper geocoding results like Main Gate NIT Trichy. The lat, lon of this result (both pickup and drop) is to be posted when creating a new ride.

`/api/user`

-   POST update user details
-   GET get user details

`/api/ride`

-   POST create a new ride for the user (inputs, departureTime, peopleCount, femaleCount, stops {lat, lon, name})

`/api/ride/current`

-   GET returns current ride and current group details
-   DELETE changes status of current ride to CANCELLED and cancelling all invites and notifiying all accepted invites

`/api/suggestions` GET returns ride suggestions (according to filter queries)

`/api/invites/send` POST send an invite, the sender agrees to share contact

`/api/invites/:id/accept` POST accept an invite, contact details is revealed

`/api/invites/:id/decline` POST reject an invite

`/api/invites/:id/remove` POST reject an invite after accepting it, provided a reason

After a ride (user) accepts an invite, the group.rides is an array of all rides.

So Graphhopper Vrp solved can be used.
