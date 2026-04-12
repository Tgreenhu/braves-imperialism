const { useState, useRef } = React;

const COLORS = {
  navy: "#13274F",
  red: "#CE1141",
  gold: "#EAAA00"
};

function App() {
  const ref = useRef();

  const [roster, setRoster] = useState({
    LF: ["Yastrzemski"],
    CF: ["Harris II"],
    RF: ["Acuña Jr"],
    SS: ["Bobby Witt Jr"],
    "3B": ["Riley"],
    "2B": ["Albies"],
    "1B": ["Olson"],
    C: ["Baldwin"],
    SP: ["Sale", "Soriano", "Lopez", "Severino", "Elder"],
    RP: ["Suarez", "Iglesias", "Lee", "Bummer", "Kinley"]
  });

  const download = async () => {
    const canvas = await html2canvas(ref.current, { scale: 2 });
    const link = document.createElement("a");
    link.download = "depth-chart.png";
    link.href = canvas.toDataURL();
    link.click();
  };

  return (
    <div className="p-6 text-center">
      <h1 className="text-3xl font-bold mb-4">Braves Imperialism</h1>

      <button
        onClick={download}
        className="bg-red-600 text-white px-4 py-2 rounded mb-4"
      >
        Download Depth Chart
      </button>

      <div
        ref={ref}
        className="mx-auto bg-green-800 text-white p-8 rounded-xl"
        style={{ width: "800px" }}
      >
        <h2 className="text-xl mb-4">Depth Chart</h2>

        <div className="grid grid-cols-3 gap-4">
          <div>LF: {roster.LF.join(", ")}</div>
          <div>CF: {roster.CF.join(", ")}</div>
          <div>RF: {roster.RF.join(", ")}</div>

          <div>3B: {roster["3B"].join(", ")}</div>
          <div>SS: {roster.SS.join(", ")}</div>
          <div>2B: {roster["2B"].join(", ")}</div>

          <div>1B: {roster["1B"].join(", ")}</div>
          <div>C: {roster.C.join(", ")}</div>
        </div>

        <div className="mt-6">
          <h3 className="font-bold">Rotation</h3>
          {roster.SP.map(p => <div key={p}>{p}</div>)}

          <h3 className="font-bold mt-4">Bullpen</h3>
          {roster.RP.map(p => <div key={p}>{p}</div>)}
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
