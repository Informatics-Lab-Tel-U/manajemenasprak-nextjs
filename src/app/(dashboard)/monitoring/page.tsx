import { ClientHeartbeatChart } from "@/components/monitoring/ClientHeartbeatChart";
import { MonitoringSummaryCards } from "@/components/monitoring/MonitoringSummaryCards";

export const metadata = {
  title: 'Monitoring Lab | Manajemen Asprak',
};

export default async function MonitoringPage() {
  return (
    <div className="container mx-auto max-w-[2000px] 2xl:px-8 space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
          Monitoring Lab
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Pantau status koneksi dan latensi PC Lab secara real-time.
        </p>
      </div>
      <MonitoringSummaryCards initialData={[]} />
      <ClientHeartbeatChart />
    </div>
  );
}
