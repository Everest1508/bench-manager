import './TitleBar.css'

export default function TitleBar() {
  const handleMinimize = () => window.electron.ipcRenderer.send('minimize')
  const handleMaximize = () => window.electron.ipcRenderer.send('maximize')
  const handleClose = () => window.electron.ipcRenderer.send('close')

  return (
    <div className="title-bar">
      <div className="title">Frappe Bench Manager</div>
      <div className="controls">
        <button onClick={handleMinimize}>─</button>
        <button onClick={handleMaximize}>□</button>
        <button onClick={handleClose}>✕</button>
      </div>
    </div>
  )
}