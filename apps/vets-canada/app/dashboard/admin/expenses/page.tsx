import { requirePermission } from "@/lib/auth";
import { sql } from "@/lib/db";
import { BUDGET_KEY } from "./constants";
import ExpensesManager, {
  type ExpenseRow,
  type ItemOption,
} from "./ExpensesManager";

export const dynamic = "force-dynamic";

export default async function ExpensesPage() {
  await requirePermission("expenses");

  const { rows } = await sql`
    SELECT e.id, e.expense_date, e.category, e.description, e.vendor, e.amount, e.is_food,
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
    isFood: r.is_food === true,
    enteredBy: r.entered_by,
  }));

  const { rows: totRows } =
    await sql`SELECT COALESCE(ROUND(SUM(amount),2),0) AS total FROM expenses;`;
  const { rows: catRows } = await sql`
    SELECT category, ROUND(SUM(amount),2) AS total
    FROM expenses GROUP BY category ORDER BY total DESC;
  `;
  const { rows: monthRows } = await sql`
    SELECT COALESCE(ROUND(SUM(amount),2),0) AS spent
    FROM expenses
    WHERE date_trunc('month', expense_date) = date_trunc('month', CURRENT_DATE);
  `;
  const { rows: budgetRows } =
    await sql`SELECT value FROM settings WHERE key = ${BUDGET_KEY};`;
  const { rows: itemRows } = await sql`
    SELECT i.id, i.name, c.name AS category
    FROM items i JOIN categories c ON c.id = i.category_id
    WHERE i.is_active = true
    ORDER BY c.display_order, i.display_order, i.name;
  `;
  const items: ItemOption[] = itemRows.map((r) => ({
    id: r.id,
    name: r.name,
    category: r.category,
  }));

  return (
    <ExpensesManager
      expenses={expenses}
      total={Number(totRows[0]?.total ?? 0)}
      byCategory={catRows.map((c) => ({
        category: c.category,
        total: Number(c.total),
      }))}
      monthSpent={Number(monthRows[0]?.spent ?? 0)}
      budget={Number(budgetRows[0]?.value ?? 0)}
      items={items}
    />
  );
}
