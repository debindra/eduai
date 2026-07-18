-- Deliberately banned pattern for scripts/ci/test-rank-order-check.mjs
SELECT child_id, rating
FROM student_outcomes
ORDER BY rating DESC;
