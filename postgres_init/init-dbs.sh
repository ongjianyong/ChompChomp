#!/bin/bash
set -e

# Create individual databases and users for each microservice to enforce the Schema-per-Service pattern

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    DO
    \$\$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'inventory_user') THEN
            CREATE ROLE inventory_user LOGIN PASSWORD 'inventory_pass';
        ELSE
            ALTER ROLE inventory_user WITH PASSWORD 'inventory_pass';
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'order_user') THEN
            CREATE ROLE order_user LOGIN PASSWORD 'order_pass';
        ELSE
            ALTER ROLE order_user WITH PASSWORD 'order_pass';
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'logistics_user') THEN
            CREATE ROLE logistics_user LOGIN PASSWORD 'logistics_pass';
        ELSE
            ALTER ROLE logistics_user WITH PASSWORD 'logistics_pass';
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'user_user') THEN
            CREATE ROLE user_user LOGIN PASSWORD 'user_pass';
        ELSE
            ALTER ROLE user_user WITH PASSWORD 'user_pass';
        END IF;
    END
    \$\$;

    SELECT 'CREATE DATABASE inventory_db OWNER inventory_user'
    WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'inventory_db')\gexec

    SELECT 'CREATE DATABASE order_db OWNER order_user'
    WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'order_db')\gexec

    SELECT 'CREATE DATABASE logistics_db OWNER logistics_user'
    WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'logistics_db')\gexec

    SELECT 'CREATE DATABASE user_db OWNER user_user'
    WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'user_db')\gexec

    GRANT ALL PRIVILEGES ON DATABASE inventory_db TO inventory_user;
    GRANT ALL PRIVILEGES ON DATABASE order_db TO order_user;
    GRANT ALL PRIVILEGES ON DATABASE logistics_db TO logistics_user;
    GRANT ALL PRIVILEGES ON DATABASE user_db TO user_user;
EOSQL
