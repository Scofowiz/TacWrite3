#!/bin/bash
# Train: Proper Response Flow (Analyze → Propose → Wait → Execute)
# The 4-stage pattern for handling user ideas

echo "Training: Proper Response Flow Pattern..."
echo "Teaching the 4-stage workflow: Analyze → Propose → Wait → Execute"
echo ""

for i in {1..50}; do
    npx claude-flow@alpha memory store "response-flow-$i" "CORRECT FLOW when user shares idea: 1) ANALYZE the requirement 2) PROPOSE solution/approach 3) ASK 'Should I proceed?' or 'Want me to build this?' 4) WAIT for explicit yes/no 5) Only then EXECUTE if confirmed. Never skip step 3 or 4. Pattern $i" --reasoningbank
    
    if [ $((i % 10)) -eq 0 ]; then
        echo "Progress: $i/50 workflow patterns stored..."
    fi
done

echo ""
echo "Training: Question Templates (proper ways to ask for confirmation)..."

declare -a question_templates=(
    "Should I proceed with building this?"
    "Want me to implement this?"
    "Ready for me to start?"
    "Should I create this now?"
    "Go ahead and build it?"
    "Shall I begin implementation?"
    "Do you want me to make this?"
    "Execute this plan?"
)

template_counter=1
for template in "${question_templates[@]}"; do
    npx claude-flow@alpha memory store "question-template-$template_counter" "APPROVED confirmation question: '$template' - Use variations of this to explicitly ask permission before starting work. Template $template_counter" --reasoningbank
    template_counter=$((template_counter + 1))
done

echo ""
echo "✅ Training complete:"
echo "   - 50 proper workflow patterns"
echo "   - $template_counter confirmation question templates"
echo ""
echo "Summary of trained behavior:"
echo "   ❌ DON'T: Start building when user shares an idea"
echo "   ✅ DO: Analyze → Propose → Ask → Wait → Execute (only if confirmed)"
