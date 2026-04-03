#!/bin/bash
set -e

# This script is idempotent and safe to run multiple times.
# It can run both during first Postgres initialization and on every stack startup.

POSTGRES_DB="${POSTGRES_DB:-postgres}"

if [ -n "${POSTGRES_HOST:-}" ]; then
    PSQL_HOST_ARGS=(--host "$POSTGRES_HOST")
else
    PSQL_HOST_ARGS=()
fi

psql -v ON_ERROR_STOP=1 "${PSQL_HOST_ARGS[@]}" --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    DO
    \$\$
    BEGIN
        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'order_user') THEN
            CREATE ROLE order_user LOGIN PASSWORD 'order_pass';
        ELSE
            ALTER ROLE order_user WITH LOGIN PASSWORD 'order_pass';
        END IF;
    END
    \$\$;

    SELECT 'CREATE DATABASE order_db OWNER order_user'
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'order_db')\gexec

    DO
    \$\$
    BEGIN
        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'user_user') THEN
            CREATE ROLE user_user LOGIN PASSWORD 'user_pass';
        ELSE
            ALTER ROLE user_user WITH LOGIN PASSWORD 'user_pass';
        END IF;
    END
    \$\$;

    SELECT 'CREATE DATABASE user_db OWNER user_user'
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'user_db')\gexec

    GRANT ALL PRIVILEGES ON DATABASE order_db TO order_user;
    GRANT ALL PRIVILEGES ON DATABASE user_db TO user_user;
EOSQL
