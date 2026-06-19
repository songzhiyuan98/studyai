const artifacts = [
  {
    id: 'a1',
    type: 'Explain',
    title: 'Supervised learning in plain language',
    content: 'A supervised model learns from examples that already include the correct answer.',
    refs: ['Lecture 01 · p1 · seg_2'],
  },
  {
    id: 'a2',
    type: 'Translate',
    title: 'Bilingual explanation of clustering',
    content: '聚类是在没有标签的情况下，把相似数据点归到同一组。',
    refs: ['Lecture 01 · p2 · seg_3'],
  },
  {
    id: 'a3',
    type: 'Mini quiz',
    title: 'Week 1 retrieval check',
    content: '3 questions generated from the selected Week 1 scope.',
    refs: ['Lecture 01 · p1-p2'],
  },
];

export default function ReviewPage() {
  return (
    <div className="page-shell">
      <div className="page-header">
        <p className="eyebrow">Review</p>
        <h1 className="page-title">Saved study artifacts</h1>
        <p className="page-description">
          Generated outputs should stay small, reusable, and tied to their original lecture sources.
        </p>
      </div>

      <div className="grid gap-4">
        {artifacts.map((artifact) => (
          <article key={artifact.id} className="card">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="mb-2 flex flex-wrap gap-2">
                  <span className="chip-blue">{artifact.type}</span>
                  {artifact.refs.map((ref) => (
                    <span key={ref} className="chip">{ref}</span>
                  ))}
                </div>
                <h2 className="text-sm font-medium text-gray-950">{artifact.title}</h2>
                <p className="mt-2 text-sm leading-6 text-gray-600">{artifact.content}</p>
              </div>
              <div className="flex gap-2">
                <button className="btn-secondary px-3 py-1.5">Open</button>
                <button className="btn-ghost px-3 py-1.5">Export</button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
