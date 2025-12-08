"""Cardinal Signposts - Navigation system for AI-assisted development.

Prevents AI code drift by providing clear, absolute location markers
throughout your codebase.
"""

__version__ = "1.0.0"
__author__ = "Scott Foster"
__email__ = "contact@theboldcode.shop"

from .generator import SignpostGenerator
from .validators import validate_signposts

__all__ = ["SignpostGenerator", "validate_signposts"]
