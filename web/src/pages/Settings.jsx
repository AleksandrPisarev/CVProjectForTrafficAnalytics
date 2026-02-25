
export default function Profile() {
  return (
    <div style={{ padding: '20px' }}>
      <h1>👤 Профиль оператора</h1>
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <div style={{ width: '80px', height: '80px', background: '#ccc', borderRadius: '50%' }}></div>
        <div>
          <h3>Александр</h3>
          <p>Роль: Администратор системы</p>
        </div>
      </div>
      <button style={{ marginTop: '20px', padding: '10px 20px', cursor: 'pointer' }}>
        Редактировать профиль
      </button>
    </div>
  );
};