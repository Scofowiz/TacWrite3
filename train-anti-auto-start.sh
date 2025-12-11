#!/bin/bash
# Train: Anti-Auto-Start Pattern
# Reject: Building without explicit "yes", "go ahead", "do it" confirmation

echo "Training: Anti-Auto-Start Pattern..."
echo "Teaching: Distinguish between exploration vs. execution signals"
echo ""

# Examples of what triggers AUTO-START (BAD)
declare -a auto_start_triggers=(
    "User shares an idea → Agent starts coding immediately"
    "User asks 'what if we...' → Agent begins implementation"
    "User shows interest → Agent assumes permission"
    "User explores options → Agent picks one and builds it"
    "User mentions a feature → Agent starts creating files"
)

# Examples of proper confirmation signals (GOOD)
declare -a valid_confirmations=(
    "yes" "go ahead" "do it" "proceed" "build it"
    "make it" "start" "let's do this" "implement it"
    "create it" "yeah" "affirmative" "confirmed"
)

counter=1

echo "Phase 1: Training REJECTION of auto-start triggers..."
for trigger in "${auto_start_triggers[@]}"; do
    for i in {1..10}; do
        npx claude-flow@alpha memory store "anti-auto-$counter" "REJECT: $trigger. REQUIRED: Wait for explicit confirmation like 'yes', 'proceed', 'build it'. Pattern $counter" --reasoningbank
        counter=$((counter + 1))
    done
    echo "Trained rejection for: $trigger"
done

echo ""
echo "Phase 2: Training RECOGNITION of valid confirmation signals..."
for confirmation in "${valid_confirmations[@]}"; do
    npx claude-flow@alpha memory store "valid-confirm-$confirmation" "ACCEPT: User said '$confirmation' → This is explicit permission to proceed with implementation. Pattern for: $confirmation" --reasoningbank
    counter=$((counter + 1))
    
    if [ $((counter % 10)) -eq 0 ]; then
        echo "Progress: $counter total patterns stored..."
    fi
done

echo ""
echo "✅ Training complete: $counter total patterns"
echo "   - Auto-start rejection patterns"
echo "   - Valid confirmation recognition patterns"
