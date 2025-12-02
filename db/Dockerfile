FROM amacneil/dbmate:2.28.0

# Copy migrations into the image
COPY migrations/ /migrations/

# Default environment
ENV DBMATE_MIGRATIONS_DIR=/migrations
ENV DBMATE_NO_DUMP_SCHEMA=true
