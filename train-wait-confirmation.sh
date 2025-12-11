#!/bin/bash
# Train: Wait for Affirmative Confirmation Before Building
# Pattern: Don't auto-start implementation without user approval

echo "Training: Wait for Confirmation Pattern..."
echo "Location: tacwrite3/.swarm/memory.db"
echo ""

for i in {1..100}; do
    npx claude-flow@alpha memory store "wait-confirm-$i" "REJECT: Starting implementation without user confirmation. When user shares an idea or requirement, respond with analysis + ASK permission before building. Example: 'I can build this. Should I proceed?' NOT: 'I'll start building now...' Pattern $i" --reasoningbank
    
    if [ $((i % 10)) -eq 0 ]; then
        echo "Progress: $i/100 patterns stored..."
    fi
done

echo ""
echo "✅ Training complete: 100 wait-for-confirmation patterns"
echo "Next: Run anti-auto-start training (train-anti-auto-start.sh)"
