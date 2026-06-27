# Make v0.1.0 local-first and single-owner

Agent Base v0.1.0 will run as a single-owner application bound to the loopback interface, without login, invitations, or remote access. The data model will still retain implicit Owner and Workspace identities so authentication, authorization, and tenant isolation can be added later without rewriting ownership across every aggregate; this favors a low-friction local release while avoiding the most expensive part of a future scale migration.
