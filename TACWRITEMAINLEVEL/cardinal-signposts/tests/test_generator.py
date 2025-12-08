"""Tests for SignpostGenerator."""

import tempfile
import shutil
from pathlib import Path
import pytest

from cardinal_signposts import SignpostGenerator


class TestSignpostGenerator:
    """Test suite for SignpostGenerator class."""
    
    @pytest.fixture
    def temp_project(self):
        """Create a temporary project structure for testing."""
        temp_dir = tempfile.mkdtemp()
        project_path = Path(temp_dir) / "test_project"
        project_path.mkdir()
        
        # Create some directories
        (project_path / "src").mkdir()
        (project_path / "src" / "models").mkdir()
        (project_path / "tests").mkdir()
        (project_path / "config").mkdir()
        
        yield project_path
        
        # Cleanup
        shutil.rmtree(temp_dir)
    
    def test_init_creates_root_signpost(self, temp_project):
        """Test that initialization creates root signpost."""
        generator = SignpostGenerator(root_path=str(temp_project))
        signposts = generator.create_signposts()
        
        root_signpost = temp_project / "_CARDINAL_ROOT.txt"
        assert root_signpost.exists()
        
        content = root_signpost.read_text()
        assert "ROOT:" in content
        assert "HERE:" in content
        assert "ROLE:" in content
    
    def test_creates_directory_signposts(self, temp_project):
        """Test that signposts are created for subdirectories."""
        generator = SignpostGenerator(root_path=str(temp_project))
        signposts = generator.create_signposts()
        
        # Should have signposts for src, src/models, tests, config
        assert len(signposts) >= 5  # root + 4 directories
        
        # Check src signpost
        src_signpost = temp_project / "src" / "_CARDINAL_SRC.txt"
        assert src_signpost.exists()
    
    def test_signpost_content_has_correct_paths(self, temp_project):
        """Test that signpost content has correct ROOT and HERE paths."""
        generator = SignpostGenerator(root_path=str(temp_project))
        generator.create_signposts()
        
        src_signpost = temp_project / "src" / "_CARDINAL_SRC.txt"
        content = src_signpost.read_text()
        
        assert f"ROOT: {temp_project}/" in content
        assert f"HERE: {temp_project / 'src'}/" in content
    
    def test_validate_signposts(self, temp_project):
        """Test validation of created signposts."""
        generator = SignpostGenerator(root_path=str(temp_project))
        generator.create_signposts()
        
        assert generator.validate() is True
    
    def test_remove_signposts(self, temp_project):
        """Test removal of all signposts."""
        generator = SignpostGenerator(root_path=str(temp_project))
        generator.create_signposts()
        
        # Remove them
        removed = generator.remove()
        assert removed > 0
        
        # Verify they're gone
        root_signpost = temp_project / "_CARDINAL_ROOT.txt"
        assert not root_signpost.exists()
    
    def test_update_signposts(self, temp_project):
        """Test updating signposts after structure changes."""
        generator = SignpostGenerator(root_path=str(temp_project))
        generator.create_signposts()
        
        # Add a new directory
        (temp_project / "docs").mkdir()
        
        # Update signposts
        updated = generator.update()
        
        # Should include new docs signpost
        docs_signpost = temp_project / "docs" / "_CARDINAL_DOCS.txt"
        assert docs_signpost.exists()
    
    def test_custom_rules_in_root(self, temp_project):
        """Test that custom rules are included in root signpost."""
        custom_rules = {
            "RULE_1": "No duplicate configs",
            "RULE_2": "Use absolute imports"
        }
        
        generator = SignpostGenerator(
            root_path=str(temp_project),
            custom_rules=custom_rules
        )
        generator.create_signposts()
        
        root_signpost = temp_project / "_CARDINAL_ROOT.txt"
        content = root_signpost.read_text()
        
        assert "RULE_1" in content
        assert "No duplicate configs" in content


if __name__ == "__main__":
    pytest.main([__file__])
