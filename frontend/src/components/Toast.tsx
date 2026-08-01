interface Toast { id: number; message: string }

export function Toasts({ toasts }: { toasts: Toast[] }) {
  return (
    <>
      {toasts.map((t) => (
        <div key={t.id} className="toast">{t.message}</div>
      ))}
    </>
  );
}
