"""Setup configuration for cardinal-signposts package."""

from setuptools import setup, find_packages
from pathlib import Path

# Read README for long description
readme_path = Path(__file__).parent / "README.md"
long_description = readme_path.read_text() if readme_path.exists() else ""

setup(
    name="cardinal-signposts",
    version="1.0.0",
    author="Scott Foster",
    author_email="contact@theboldcode.shop",
    description="Navigation system for AI-assisted development",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/scofowiz/cardinal-signposts",
    packages=find_packages(),
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Developers",
        "Topic :: Software Development :: Code Generators",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
    ],
    python_requires=">=3.8",
    install_requires=[
        "click>=8.0.0",
    ],
    extras_require={
        "dev": [
            "pytest>=7.0.0",
            "pytest-cov>=4.0.0",
            "flake8>=6.0.0",
            "black>=23.0.0",
            "mypy>=1.0.0",
        ],
    },
    entry_points={
        "console_scripts": [
            "cardinal-signpost=cardinal_signposts.cli:cli",
        ],
    },
    keywords="ai development navigation code-generation signposts",
    project_urls={
        "Bug Reports": "https://github.com/scofowiz/cardinal-signposts/issues",
        "Source": "https://github.com/scofowiz/cardinal-signposts",
        "Documentation": "https://github.com/scofowiz/cardinal-signposts#readme",
    },
)
