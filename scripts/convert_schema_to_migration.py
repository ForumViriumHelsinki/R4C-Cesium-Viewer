#!/usr/bin/env python3
"""
Convert pg_dump schema output to dbmate migration format.
Cleans up pg_dump artifacts and creates proper up/down migrations.
"""

import re
import sys

def clean_schema_dump(content):
    """Remove pg_dump artifacts and format for dbmate."""
    lines = content.split('\n')
    cleaned_lines = []

    # Skip initial SET statements and comments
    skip_patterns = [
        r'^SET ',
        r'^SELECT pg_catalog\.set_config',
        r'^--$',
        r'^\s*$',
    ]

    # Remove ownership and privilege statements
    ownership_patterns = [
        r'ALTER .* OWNER TO .*;',
        r'GRANT .* TO .*;',
        r'REVOKE .* FROM .*;',
    ]

    for line in lines:
        # Skip unwanted lines
        if any(re.match(pattern, line) for pattern in skip_patterns):
            continue

        # Skip ownership/privilege lines
        if any(re.match(pattern, line) for pattern in ownership_patterns):
            continue

        # Keep meaningful content
        cleaned_lines.append(line)

    return '\n'.join(cleaned_lines)

def extract_table_names(content):
    """Extract table names for down migration."""
    table_pattern = r'CREATE TABLE public\.(\w+)'
    tables = re.findall(table_pattern, content)
    return tables

def create_down_migration(tables):
    """Create down migration that drops all tables."""
    down_lines = []

    # Drop tables in reverse order
    for table in reversed(tables):
        down_lines.append(f"DROP TABLE IF EXISTS public.{table} CASCADE;")

    # Drop sequences
    down_lines.append("")
    down_lines.append("-- Drop sequences")
    for table in reversed(tables):
        down_lines.append(f"DROP SEQUENCE IF EXISTS public.{table}_id_seq CASCADE;")

    # Drop function
    down_lines.append("")
    down_lines.append("-- Drop functions")
    down_lines.append("DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;")

    # Note about extensions (commented out for safety)
    down_lines.append("")
    down_lines.append("-- Extensions and schemas (uncomment if needed)")
    down_lines.append("-- DROP EXTENSION IF EXISTS postgis CASCADE;")
    down_lines.append("-- DROP EXTENSION IF EXISTS google_vacuum_mgmt CASCADE;")
    down_lines.append("-- DROP SCHEMA IF EXISTS google_vacuum_mgmt CASCADE;")

    return '\n'.join(down_lines)

def main():
    if len(sys.argv) != 3:
        print("Usage: python convert_schema_to_migration.py input_schema.sql output_migration.sql")
        sys.exit(1)

    input_file = sys.argv[1]
    output_file = sys.argv[2]

    # Read input schema
    with open(input_file, 'r') as f:
        content = f.read()

    # Clean the schema
    cleaned_content = clean_schema_dump(content)

    # Extract table names for down migration
    tables = extract_table_names(cleaned_content)

    # Create down migration
    down_migration = create_down_migration(tables)

    # Create complete migration file
    migration_content = f"""-- migrate:up

{cleaned_content}

-- migrate:down

{down_migration}
"""

    # Write output
    with open(output_file, 'w') as f:
        f.write(migration_content)

    print(f"Created migration file: {output_file}")
    print(f"Found {len(tables)} tables: {', '.join(tables[:5])}{'...' if len(tables) > 5 else ''}")

if __name__ == "__main__":
    main()
