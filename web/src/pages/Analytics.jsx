import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

// Представь, что эти данные прилетели с твоего Python-бэкенда
const data = [
  { time: '08:00', cars: 120 },
  { time: '10:00', cars: 450 },
  { time: '12:00', cars: 300 },
  { time: '14:00', cars: 520 },
  { time: '16:00', cars: 800 },
  { time: '18:00', cars: 950 },
  { time: '20:00', cars: 400 },
];

export default function Analytics() {
  return (
    <div style={{ padding: '20px',  width: '100%', height: '400px', background: '#fff', borderRadius: '12px' }}>
      <h2>📈 Трафик автомобилей</h2>
      
      <ResponsiveContainer width="100%" height="100%" minHeight={400}>
        <AreaChart data={data}>
          {/* Сетка */}
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          {/* Оси */}
          <XAxis dataKey="time" />
          <YAxis />
          {/* Подсказка при наведении */}
          <Tooltip />
          {/* Сам график с градиентной заливкой */}
          <Area 
            type="monotone" 
            dataKey="cars" 
            stroke="#646cff" 
            fillOpacity={0.3} 
            fill="#646cff" 
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};