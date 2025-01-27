# RideNITT TC
Please checkout `prisma/schema.prisma`

# API Endpoints

`/auth/send-otp` POST user enters phone number

`/auth/verify-otp` POST user enters otp and jwt is attached as cookie (web app right)

`/api/user`
- POST update user details
- GET get user details

`/api/ride`
- POST create a new ride for the user (inputs, departureTime, peopleCount, femaleCount, stops (lat, lng, name))
- Workflow- Every ride is a part of a group (with only one ride initially)

`/api/ride/current` GET returns current ride and current group details

`/api/suggestions` GET returns Suggestions of groups the current ride can pair with

`/api/invites/send` POST send an invite

`/api/invites/accept` POST accept an invite, two groups are merged

`/api/invites/decline` POST reject an invite

After a ride (user) accepts an invite, the group.rides is an array of all rides.

So Graphhopper Vrp solved can be used.