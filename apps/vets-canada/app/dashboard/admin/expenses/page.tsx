import { requirePermission } from "@/lib/auth";
import { sql } from "@/lib/db";
import ExpensesManager, { type ExpenseRow } from "./ExpensesManager";

export const dynamic = "force-dynamic";

export default async function ExpensesPage() {
  await requirePermission("expenses");

  const { rows } = await sql`
    SELECT e.id, e.expense_date, e.category, e.description, e.vendor, e.amount,
           u.name AS entered_by
    FROM expenses e
    LEFT JOIN users u ON u.id = e.created_by
    ORDER BY e.expense_date DESC, e.id DESC
    LIMIT 500;
  `;
  const expenses: ExpenseRow[] = rows.map((r) => ({
    id: r.id,
    date: new Date(r.expense_date).toLocaleDateString(),
    category: r.category,
    description: r.description,
    vendor: r.vendor,
    amount: Number(r.amount),
    enteredBy: r.entered_by,
  }));

  const { rows: totRows } = await sql`SELECT COALESCE(ROUND(SUM(amount),2),0) AS total FROM expenses;`;
  const { rows: catRows } = await sql`
    SELECT category, ROUND(SUM(amount),2) AS total
    FROM expenses GROUP BY category ORDER BY total DESC;
  `;

  return (
    <ExpensesManager
      expenses={expenses}
      total={Number(totRows[0]?.total ?? 0)}
      byCategory={catRows.map((c) => ({ category: c.category, total: Number(c.total) }))}
    />
  );
}
