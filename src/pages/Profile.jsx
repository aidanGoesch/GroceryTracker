function Profile() {
  function lockApp() {
    localStorage.removeItem('grocery_tracker_authed')
    window.location.reload()
  }

  return (
    <section className="page">
      <header className="page-header">
        <h1 className="page-title">profile</h1>
      </header>
      <div className="panel">
        <p className="empty-note">App is protected by a server-validated password gate.</p>
        <button type="button" className="text-button" onClick={lockApp}>
          lock app
        </button>
      </div>
    </section>
  )
}

export default Profile
