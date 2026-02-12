export const StatCard = ({ title, value, color, icon: Icon }) => {
  const colors = {
    blue: "bg-blue-600",
    green: "bg-green-600",
    orange: "bg-orange-500",
    red: "bg-red-600"
  };

  return (
    <div className={`${colors[color]} p-4 rounded-lg shadow-md text-white flex justify-between items-center`}>
      <div>
        <p className="text-xs font-semibold uppercase">{title}</p>
        <p className="text-3xl font-bold">{value}</p>
      </div>
      {Icon && <Icon size={32} opacity={0.5} />}
    </div>
  );
};