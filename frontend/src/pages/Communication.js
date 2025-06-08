import EmailInterface from "../components/outlook/EmailInterface"
import "../components/outlook/outlook-style.css"

function Communication() {
  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Communication</h1>
      </div>
      <EmailInterface />
    </div>
  )
}

export default Communication