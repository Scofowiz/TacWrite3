"""Command-line interface for Cardinal Signposts."""

import click
from pathlib import Path
from .generator import SignpostGenerator
from .validators import validate_signposts


@click.group()
@click.version_option(version="1.0.0")
def cli():
    """Cardinal Signposts - Navigation system for AI-assisted development."""
    pass


@cli.command()
@click.option(
    '--path',
    default='.',
    help='Project root path (default: current directory)'
)
@click.option(
    '--format',
    type=click.Choice(['txt', 'json', 'yaml', 'toml']),
    default='txt',
    help='Signpost format'
)
@click.option(
    '--include-tree/--no-tree',
    default=False,
    help='Include directory tree in root signpost'
)
@click.option(
    '--max-depth',
    default=10,
    help='Maximum directory depth to traverse'
)
def init(path, format, include_tree, max_depth):
    """Initialize cardinal signposts in a project."""
    root_path = Path(path).resolve()
    
    click.echo(f"Initializing cardinal signposts in: {root_path}")
    
    try:
        generator = SignpostGenerator(
            root_path=str(root_path),
            format=format,
            include_tree=include_tree
        )
        
        created = generator.create_signposts(max_depth=max_depth)
        
        click.echo(f"✅ Created {len(created)} signposts")
        for signpost in created[:5]:  # Show first 5
            click.echo(f"  - {signpost.relative_to(root_path)}")
        
        if len(created) > 5:
            click.echo(f"  ... and {len(created) - 5} more")
            
    except Exception as e:
        click.echo(f"❌ Error: {e}", err=True)
        raise click.Abort()


@cli.command()
@click.option(
    '--path',
    default='.',
    help='Project root path (default: current directory)'
)
def validate(path):
    """Validate cardinal signposts in a project."""
    root_path = Path(path).resolve()
    
    click.echo(f"Validating signposts in: {root_path}")
    
    try:
        is_valid = validate_signposts(root_path)
        
        if is_valid:
            click.echo("✅ All signposts are valid")
        else:
            click.echo("❌ Validation failed - check signposts", err=True)
            raise click.Abort()
            
    except Exception as e:
        click.echo(f"❌ Error: {e}", err=True)
        raise click.Abort()


@cli.command()
@click.option(
    '--path',
    default='.',
    help='Project root path (default: current directory)'
)
def update(path):
    """Update cardinal signposts after structure changes."""
    root_path = Path(path).resolve()
    
    click.echo(f"Updating signposts in: {root_path}")
    
    try:
        generator = SignpostGenerator(root_path=str(root_path))
        updated = generator.update()
        
        click.echo(f"✅ Updated {len(updated)} signposts")
        
    except Exception as e:
        click.echo(f"❌ Error: {e}", err=True)
        raise click.Abort()


@cli.command()
@click.option(
    '--path',
    default='.',
    help='Project root path (default: current directory)'
)
@click.confirmation_option(
    prompt='Are you sure you want to remove all signposts?'
)
def remove(path):
    """Remove all cardinal signposts from a project."""
    root_path = Path(path).resolve()
    
    click.echo(f"Removing signposts from: {root_path}")
    
    try:
        generator = SignpostGenerator(root_path=str(root_path))
        removed = generator.remove()
        
        click.echo(f"✅ Removed {removed} signposts")
        
    except Exception as e:
        click.echo(f"❌ Error: {e}", err=True)
        raise click.Abort()


@cli.command()
@click.option(
    '--path',
    default='.',
    help='Project root path (default: current directory)'
)
@click.option(
    '--interactive/--no-interactive',
    default=False,
    help='Interactively approve each directory'
)
@click.option(
    '--dry-run/--no-dry-run',
    default=False,
    help='Preview changes without creating files'
)
def scan(path, interactive, dry_run):
    """Scan existing directories and create signposts."""
    root_path = Path(path).resolve()
    
    if dry_run:
        click.echo(f"[DRY RUN] Scanning: {root_path}")
    else:
        click.echo(f"Scanning: {root_path}")
    
    try:
        generator = SignpostGenerator(root_path=str(root_path))
        
        if dry_run:
            # Just show what would be created
            click.echo(f"Would create signposts in:")
            for dirpath, dirnames, _ in os.walk(root_path):
                dirnames[:] = [
                    d for d in dirnames 
                    if not d.startswith('.') 
                    and d not in ['node_modules', '__pycache__', 'venv']
                ]
                rel_path = Path(dirpath).relative_to(root_path)
                if str(rel_path) != '.':
                    click.echo(f"  - {rel_path}")
        else:
            created = generator.create_signposts()
            click.echo(f"✅ Created {len(created)} signposts")
            
    except Exception as e:
        click.echo(f"❌ Error: {e}", err=True)
        raise click.Abort()


if __name__ == '__main__':
    cli()
