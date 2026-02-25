import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default function Analytics() {
  const data = [
    { id: "01", name: "Traffic Analysis", status: "Active", value: "$2,500.00" },
    { id: "02", name: "CV Project", status: "Pending", value: "$1,200.00" },
    { id: "03", name: "Network Security", status: "Completed", value: "$3,800.00" },
  ];

  return (
    <div className="p-10 flex flex-col items-center">
      <h1 className="text-3xl font-bold text-white mb-8">
        Аналитика Трафика
      </h1>

      {/* Стеклянный контейнер таблицы */}
      <div className="w-full max-w-4xl rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl overflow-hidden">
        <Table>
          <TableHeader className="bg-white/5">
            <TableRow className="border-white/10 hover:bg-transparent">
              <TableHead className="text-cyan-400 font-bold">ID</TableHead>
              <TableHead className="text-cyan-400 font-bold">Название проекта</TableHead>
              <TableHead className="text-cyan-400 font-bold">Статус</TableHead>
              <TableHead className="text-cyan-400 font-bold text-right">Значение</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item) => (
              <TableRow key={item.id} className="border-white/5 hover:bg-white/10 transition-all duration-300 group">
                <TableCell className="text-white/60 group-hover:text-white">{item.id}</TableCell>
                <TableCell className="text-white font-medium">{item.name}</TableCell>
                <TableCell>
                   <span className="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-400 text-xs border border-cyan-500/30">
                     {item.status}
                   </span>
                </TableCell>
                <TableCell className="text-right text-cyan-400 font-mono">{item.value}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}