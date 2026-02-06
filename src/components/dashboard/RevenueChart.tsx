import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { es } from "date-fns/locale";

export function RevenueChart() {
  const [data, setData] = useState<{ date: string; fullDate: string; amount: number }[]>([]);

  useEffect(() => {
    const fetchRevenue = async () => {
      const today = new Date();
      const thirtyDaysAgo = subDays(today, 30);
      
      const { data: transactions, error } = await supabase
        .from('transacciones')
        .select('monto, fecha_transaccion')
        .gte('fecha_transaccion', startOfDay(thirtyDaysAgo).toISOString())
        .lte('fecha_transaccion', endOfDay(today).toISOString())
        .order('fecha_transaccion', { ascending: true });

      if (error) {
        console.error('Error fetching revenue:', error);
        return;
      }

      // Group by date
      const groupedData = new Map<string, number>();
      
      // Initialize last 30 days with 0
      for (let i = 0; i <= 30; i++) {
        const d = subDays(today, 30 - i);
        const key = format(d, 'yyyy-MM-dd');
        groupedData.set(key, 0);
      }

      transactions?.forEach(t => {
        const dateKey = format(new Date(t.fecha_transaccion), 'yyyy-MM-dd');
        const currentAmount = groupedData.get(dateKey) || 0;
        groupedData.set(dateKey, currentAmount + Number(t.monto));
      });

      const formattedData = Array.from(groupedData.entries()).map(([key, value]) => ({
        date: format(new Date(key), 'dd MMM', { locale: es }),
        fullDate: format(new Date(key), 'dd MMM yyyy', { locale: es }),
        amount: value
      }));

      setData(formattedData);
    };

    fetchRevenue();
  }, []);

  return (
    <Card className="col-span-4 lg:col-span-3">
      <CardHeader>
        <CardTitle>Ingresos Últimos 30 Días</CardTitle>
      </CardHeader>
      <CardContent className="pl-2">
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                minTickGap={30}
              />
              <YAxis
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `S/ ${value}`}
              />
              <Tooltip 
                formatter={(value: number) => [`S/ ${value.toFixed(2)}`, 'Ingresos']}
                labelFormatter={(label) => label}
              />
              <CartesianGrid vertical={false} stroke="#f5f5f5" />
              <Area 
                type="monotone" 
                dataKey="amount" 
                stroke="#10b981" 
                fillOpacity={1} 
                fill="url(#colorIngresos)" 
                />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
