import { Head, Link } from '@inertiajs/react';
import { useState } from 'react';
export default function Bootstrap({ screen }: { screen: string }) {
  const [checked, setChecked] = useState(false);
  return <main className="mx-auto max-w-xl p-8"><Head title="Changuito — Bootstrap"/><h1 className="text-3xl font-bold">Changuito</h1><p>Entorno técnico disponible</p><p>Pantalla: {screen}</p><nav aria-label="Bootstrap"><Link href="/">Inicio</Link>{' · '}<Link href="/bootstrap/check">Verificación</Link></nav><button className="mt-4 rounded border p-2" onClick={() => setChecked(true)}>Comprobar interacción</button><p role="status">{checked ? 'Interacción lista' : 'Esperando interacción'}</p></main>;
}
