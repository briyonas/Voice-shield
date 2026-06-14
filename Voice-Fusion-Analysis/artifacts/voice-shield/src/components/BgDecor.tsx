export function BgDecor() {
  return (
    <div className="bg-decor" aria-hidden>
      <div className="bg-grid" />
      <div
        className="bg-orb"
        style={{
          width: 500,
          height: 500,
          top: -100,
          left: -100,
          background:
            "radial-gradient(circle, rgba(200,0,255,0.10) 0%, transparent 70%)",
          animationDelay: "0s",
        }}
      />
      <div
        className="bg-orb"
        style={{
          width: 400,
          height: 400,
          top: "40%",
          right: -80,
          background:
            "radial-gradient(circle, rgba(233,30,140,0.09) 0%, transparent 70%)",
          animationDelay: "-3s",
        }}
      />
      <div
        className="bg-orb"
        style={{
          width: 350,
          height: 350,
          bottom: "10%",
          left: "20%",
          background:
            "radial-gradient(circle, rgba(0,188,212,0.07) 0%, transparent 70%)",
          animationDelay: "-6s",
        }}
      />
    </div>
  );
}
