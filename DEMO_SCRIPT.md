# Video Demonstration Script

1. Show the project structure and `.env.example`; explain that real `.env` files are ignored.
2. Start PostgreSQL, MongoDB, Redis, the server, and the React client.
3. Open the dashboard and register or sign in.
4. Show live Bike, Car, and Truck availability.
5. Park one car and show its ticket and assigned slot.
6. Show the active ticket table, then complete the exit and show duration and fare.
7. Explain that the backend calculates fare from server timestamps.
8. Fill the two truck slots and submit three concurrent requests; show two successful assignments and one `409 Parking Full` response.
9. Show that an exit releases the slot and that history contains the completed ticket.
10. Explain PostgreSQL row locking, MongoDB audit events, Redis caching/invalidation, validation, JWT, bcrypt, and rate limiting.
