
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export function ActivityChart() {
  const labels = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
  const [data, setData] = useState(labels.map((name) => ({ name, asistencias: 0 })));

  useEffect(() => {
    const fetchWeekly = async () => {
      const now = new Date();
      const monday = new Date(now);
      const day = monday.getDay(); // 0=Dom, 1=Lun, ... 6=Sáb
      const diffToMonday = (day + 6) % 7; // convierte getDay a índice Lunes=0
      monday.setDate(monday.getDate() - diffToMonday);
      monday.setHours(0, 0, 0, 0);

      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      sunday.setHours(23, 59, 59, 999);

      const { data: rows, error } = await supabase
        .from("asistencias")
        .select("id, fecha_asistencia")
        .gte("fecha_asistencia", monday.toISOString())
        .lte("fecha_asistencia", sunday.toISOString());

      if (error) {
        console.error("Error cargando asistencias semanales:", error.message);
        return;
      }

      const counts = Array(7).fill(0);
      for (const r of rows || []) {
        const d = new Date(r.fecha_asistencia);
        const idx = (d.getDay() + 6) % 7; // Lunes=0 ... Domingo=6
        counts[idx] += 1;
      }

      setData(labels.map((name, i) => ({ name, asistencias: counts[i] })));
    };

    fetchWeekly();
  }, []);

  return (
    <Card className="col-span-4">
      <CardHeader>
        <CardTitle>Asistencias Semanales</CardTitle>
      </CardHeader>
      <CardContent className="pl-2">
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <XAxis
                dataKey="name"
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value}`}
              />
              <Tooltip 
                cursor={{fill: 'transparent'}}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <CartesianGrid vertical={false} stroke="#f5f5f5" />
              <Bar dataKey="asistencias" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
