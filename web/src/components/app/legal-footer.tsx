// Legal entities, as listed under the account summary on dank.capital.
const ENTITIES = [
  {
    name: "DANK Capital, SAPI de CV",
    detail:
      "RFC: DCA 140408EF7 · Carretera Transpeninsular km 19.5, Cabo Real, San José del Cabo, BCS, México",
  },
  {
    name: "DANK Capital LLC",
    detail: "170 SE 14 Street, APT 2102, Miami, FL 33131, USA",
  },
  { name: "DANK Capital UG", detail: "Beedstr. 54, 40468 Düsseldorf, Germany" },
];

export function LegalFooter() {
  return (
    <footer className="mt-12 space-y-3 border-t border-line pt-6 text-xs text-faint">
      {ENTITIES.map((entity) => (
        <p key={entity.name}>
          <span className="text-muted">{entity.name}</span>
          <br />
          {entity.detail}
        </p>
      ))}
    </footer>
  );
}
