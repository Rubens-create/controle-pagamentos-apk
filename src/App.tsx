import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Plus,
  CheckCircle2,
  Circle,
  Trash2,
  Receipt,
  Calendar,
  Wallet,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from './lib/utils';
import { PaymentItem } from './types';

// ─── helpers ────────────────────────────────────────────────────────────────

function getDueStatus(dueDay: number | null, isPaid: boolean) {
  if (!dueDay || isPaid) return null;
  const today = new Date().getDate();
  const diff = dueDay - today;
  if (diff < 0) return 'overdue';   // passou
  if (diff === 0) return 'today';   // vence hoje
  if (diff <= 3) return 'soon';     // vence em até 3 dias
  return 'ok';
}

function dueBadgeLabel(dueDay: number, isPaid: boolean) {
  if (isPaid) return null;
  const today = new Date().getDate();
  const diff = dueDay - today;
  if (diff < 0) return `Venceu dia ${dueDay}`;
  if (diff === 0) return 'Vence hoje';
  if (diff === 1) return 'Vence amanhã';
  return `Vence dia ${dueDay}`;
}

// Sort: vencimentos mais próximos primeiro, depois sem data, depois pagos
function sortItems(items: PaymentItem[]): PaymentItem[] {
  const unpaid = items.filter(i => !i.isPaid).sort((a, b) => {
    if (a.dueDay && b.dueDay) return a.dueDay - b.dueDay;
    if (a.dueDay) return -1;
    if (b.dueDay) return 1;
    return a.createdAt - b.createdAt;
  });
  const paid = items.filter(i => i.isPaid).sort((a, b) => {
    if (a.dueDay && b.dueDay) return a.dueDay - b.dueDay;
    return a.createdAt - b.createdAt;
  });
  return [...unpaid, ...paid];
}

// ─── App ────────────────────────────────────────────────────────────────────

function App() {
  const [items, setItems] = useState<PaymentItem[]>(() => {
    const saved = localStorage.getItem('@pagamentos:items');
    return saved ? JSON.parse(saved) : [];
  });

  const [lastResetMonth, setLastResetMonth] = useState<string>(() => {
    return localStorage.getItem('@pagamentos:lastResetMonth') || format(new Date(), 'yyyy-MM');
  });

  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newRecurring, setNewRecurring] = useState(true);
  const [newDueDay, setNewDueDay] = useState('');

  // Monthly reset
  useEffect(() => {
    const currentMonth = format(new Date(), 'yyyy-MM');
    if (currentMonth !== lastResetMonth) {
      setItems(prev =>
        prev
          .filter(item => !(item.isPaid && !item.isRecurring))
          .map(item =>
            item.isPaid && item.isRecurring ? { ...item, isPaid: false } : item
          )
      );
      setLastResetMonth(currentMonth);
      localStorage.setItem('@pagamentos:lastResetMonth', currentMonth);
    }
  }, [lastResetMonth]);

  useEffect(() => {
    localStorage.setItem('@pagamentos:items', JSON.stringify(items));
  }, [items]);

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const parsedDay = parseInt(newDueDay, 10);
    const dueDay = newDueDay && parsedDay >= 1 && parsedDay <= 31 ? parsedDay : null;

    const newItem: PaymentItem = {
      id: crypto.randomUUID(),
      title: newTitle.trim(),
      amount: newAmount ? parseFloat(newAmount.replace(',', '.')) : null,
      isPaid: false,
      isRecurring: newRecurring,
      dueDay,
      createdAt: Date.now(),
    };

    setItems(prev => [...prev, newItem]);
    setNewTitle('');
    setNewAmount('');
    setNewDueDay('');
    setIsAdding(false);
  };

  const togglePaid = (id: string) => {
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, isPaid: !item.isPaid } : item
    ));
  };

  const deleteItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const sorted = sortItems(items);
  const unpaidItems = sorted.filter(i => !i.isPaid);
  const paidItems = sorted.filter(i => i.isPaid);

  const totalToPay = items.filter(i => !i.isPaid).reduce((acc, curr) => acc + (curr.amount || 0), 0);
  const totalPaid = items.filter(i => i.isPaid).reduce((acc, curr) => acc + (curr.amount || 0), 0);
  const progress = items.length === 0 ? 0 : (items.filter(i => i.isPaid).length / items.length) * 100;

  const overdueCount = items.filter(i => getDueStatus(i.dueDay, i.isPaid) === 'overdue').length;

  return (
    <div className="min-h-[100dvh] bg-slate-50 font-sans text-slate-900 flex flex-col max-w-md mx-auto shadow-xl relative overflow-hidden">

      {/* ── Header ── */}
      <header className="bg-emerald-600 text-white pt-10 pb-6 px-6 rounded-b-3xl shadow-lg z-10">
        <div className="flex justify-between items-center mb-5">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Pagamentos</h1>
            <p className="text-emerald-100 text-sm flex items-center gap-1 mt-0.5">
              <Calendar className="w-4 h-4" />
              {format(new Date(), "MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          </div>
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
            <Wallet className="w-6 h-6" />
          </div>
        </div>

        {/* Overdue alert */}
        <AnimatePresence>
          {overdueCount > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex items-center gap-2 bg-red-500/30 border border-red-400/40 rounded-xl px-3 py-2 mb-4 text-sm"
            >
              <AlertCircle className="w-4 h-4 shrink-0 text-red-200" />
              <span className="text-red-100 font-medium">
                {overdueCount} conta{overdueCount > 1 ? 's' : ''} vencida{overdueCount > 1 ? 's' : ''}!
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="bg-white/20 rounded-2xl p-4 backdrop-blur-md border border-white/20">
          <div className="flex justify-between items-end mb-3">
            <div>
              <p className="text-emerald-100 text-xs font-semibold uppercase tracking-wider mb-1">A Pagar</p>
              <p className="text-3xl font-bold flex items-start gap-1">
                <span className="text-lg mt-1">R$</span>
                {totalToPay.toFixed(2).replace('.', ',')}
              </p>
            </div>
            <div className="text-right">
              <p className="text-emerald-100 text-xs font-semibold uppercase tracking-wider mb-1">Pago</p>
              <p className="text-lg font-semibold opacity-90">
                R$ {totalPaid.toFixed(2).replace('.', ',')}
              </p>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs text-emerald-100 mb-1 font-medium">
              <span>Progresso</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="h-2 bg-black/20 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-white rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>
          </div>
        </div>
      </header>

      {/* ── List ── */}
      <main className="flex-1 px-4 py-5 overflow-y-auto pb-24 space-y-3">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-slate-400 space-y-4 pt-16">
            <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center">
              <Receipt className="w-10 h-10 text-slate-300" />
            </div>
            <p className="text-center px-8 text-sm leading-relaxed">
              Nenhuma conta cadastrada.<br />Toque no <strong className="text-emerald-500">+</strong> para adicionar.
            </p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {unpaidItems.map(item => (
              <PaymentRow
                key={item.id}
                item={item}
                onToggle={() => togglePaid(item.id)}
                onDelete={() => deleteItem(item.id)}
              />
            ))}

            {paidItems.length > 0 && (
              <motion.div
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="pt-3 pb-1"
              >
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2">
                  Concluídos
                </h3>
              </motion.div>
            )}

            {paidItems.map(item => (
              <PaymentRow
                key={item.id}
                item={item}
                onToggle={() => togglePaid(item.id)}
                onDelete={() => deleteItem(item.id)}
              />
            ))}
          </AnimatePresence>
        )}
      </main>

      {/* ── FAB ── */}
      <div className="absolute bottom-6 right-6 z-40">
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={() => setIsAdding(true)}
          className="w-14 h-14 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-xl shadow-emerald-500/40 hover:bg-emerald-600 transition-colors"
        >
          <Plus className="w-7 h-7" />
        </motion.button>
      </div>

      {/* ── Add Modal ── */}
      <AnimatePresence>
        {isAdding && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAdding(false)}
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
              className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl z-50 p-6 shadow-2xl"
            >
              {/* Drag handle */}
              <div className="w-10 h-1.5 bg-slate-200 rounded-full mx-auto mb-5" />
              <h2 className="text-xl font-bold mb-5 text-slate-800">Nova Conta</h2>

              <form onSubmit={handleAddItem} className="space-y-4">
                {/* Nome */}
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-1.5">
                    Nome da conta
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    placeholder="Ex: Aluguel, Internet, Luz..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all text-sm"
                  />
                </div>

                {/* Valor + Dia de vencimento lado a lado */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-slate-600 mb-1.5">
                      Valor <span className="text-slate-400 font-normal">(opc.)</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">R$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={newAmount}
                        onChange={e => setNewAmount(e.target.value)}
                        placeholder="0,00"
                        className="w-full pl-9 pr-3 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-600 mb-1.5 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      Dia vence <span className="text-slate-400 font-normal">(opc.)</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={newDueDay}
                        onChange={e => setNewDueDay(e.target.value)}
                        placeholder="Ex: 10"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Preview do dia */}
                <AnimatePresence>
                  {newDueDay && parseInt(newDueDay) >= 1 && parseInt(newDueDay) <= 31 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2.5 text-sm text-blue-700">
                        <Calendar className="w-4 h-4 shrink-0 text-blue-500" />
                        <span>
                          Vence todo dia <strong>{newDueDay}</strong> do mês
                        </span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Recorrente toggle */}
                <label className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer select-none">
                  <div className="relative flex items-center">
                    <input
                      type="checkbox"
                      checked={newRecurring}
                      onChange={e => setNewRecurring(e.target.checked)}
                      className="peer sr-only"
                    />
                    <div className="w-11 h-6 bg-slate-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-800">Conta Fixa mensal</p>
                    <p className="text-xs text-slate-500">Reinicia a marcação todo dia 1</p>
                  </div>
                </label>

                <button
                  type="submit"
                  className="w-full bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-emerald-500/20"
                >
                  Adicionar Conta
                </button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── PaymentRow ──────────────────────────────────────────────────────────────

function PaymentRow({
  item,
  onToggle,
  onDelete,
}: {
  item: PaymentItem;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const status = getDueStatus(item.dueDay, item.isPaid);
  const badgeLabel = item.dueDay ? dueBadgeLabel(item.dueDay, item.isPaid) : null;

  const statusStyles = {
    overdue: 'bg-red-50 border-red-200',
    today: 'bg-orange-50 border-orange-200',
    soon: 'bg-yellow-50 border-yellow-200',
    ok: 'bg-white border-slate-100',
  };

  const badgeStyles = {
    overdue: 'bg-red-100 text-red-600',
    today: 'bg-orange-100 text-orange-600',
    soon: 'bg-yellow-100 text-yellow-700',
    ok: 'bg-slate-100 text-slate-500',
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.94 }}
      className={cn(
        'group border rounded-2xl shadow-sm flex items-center gap-3 px-4 py-3.5 transition-all duration-300',
        item.isPaid
          ? 'bg-slate-50 border-slate-100 opacity-60'
          : status
          ? statusStyles[status]
          : 'bg-white border-slate-100'
      )}
    >
      {/* Checkbox */}
      <button onClick={onToggle} className="shrink-0 focus:outline-none">
        {item.isPaid ? (
          <CheckCircle2 className="w-7 h-7 text-emerald-500" />
        ) : (
          <Circle className="w-7 h-7 text-slate-300 hover:text-emerald-400 transition-colors" />
        )}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0 cursor-pointer" onClick={onToggle}>
        <h3
          className={cn(
            'font-semibold truncate text-base transition-colors',
            item.isPaid ? 'text-slate-400 line-through decoration-slate-300' : 'text-slate-800'
          )}
        >
          {item.title}
        </h3>

        <div className="flex items-center flex-wrap gap-1.5 mt-1">
          {/* Valor */}
          {item.amount != null && (
            <span className={cn('text-sm font-medium', item.isPaid ? 'text-slate-400' : 'text-slate-600')}>
              R$ {item.amount.toFixed(2).replace('.', ',')}
            </span>
          )}

          {/* Recorrente pill */}
          {item.isRecurring && (
            <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-md">
              Fixa
            </span>
          )}

          {/* Due badge */}
          {badgeLabel && !item.isPaid && status && (
            <span className={cn('text-[11px] font-semibold px-1.5 py-0.5 rounded-md flex items-center gap-0.5', badgeStyles[status])}>
              {(status === 'overdue' || status === 'today') && (
                <AlertCircle className="w-3 h-3" />
              )}
              {status === 'soon' && <Clock className="w-3 h-3" />}
              {badgeLabel}
            </span>
          )}

          {/* Paid + dueDay info */}
          {item.isPaid && item.dueDay && (
            <span className="text-[11px] text-slate-400 flex items-center gap-0.5">
              <Calendar className="w-3 h-3" /> dia {item.dueDay}
            </span>
          )}
        </div>
      </div>

      {/* Delete */}
      <button
        onClick={onDelete}
        className="shrink-0 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors opacity-100 sm:opacity-0 group-hover:opacity-100 focus:opacity-100"
      >
        <Trash2 className="w-5 h-5" />
      </button>
    </motion.div>
  );
}

export default App;
