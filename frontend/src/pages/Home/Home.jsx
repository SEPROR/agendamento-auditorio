import { useState, useEffect } from "react";
import { Calendar, User, Tag, CheckCircle2, AlertCircle, Info } from "lucide-react";
import { ASSUNTOS, SALAS } from "../../constants.js";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import SelectField from "../../components/SelectField";
import InputField from "../../components/InputField";
import SalaCard from "../../components/SalaCard";
import CalendarPanel from "../../components/CalendarPanel";
import SuccessScreen from "../../components/SuccessScreen";
import styles from "./index.module.css";

const API_URL = "http://localhost:3000"; // ajuste se seu backend estiver em outra porta/host

const EMPTY_FORM = {
  nome: "", setor: "", assunto: "", sala: "",
  data: "", hora_inicio: "", hora_fim: "", observacoes: "",
};

const Home = () => {
  const [form, setForm]           = useState(EMPTY_FORM);
  const [errors, setErrors]       = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [enviando, setEnviando]   = useState(false);

  // Setores vindos do backend
  const [setores, setSetores] = useState([]);
  const [carregandoSetores, setCarregandoSetores] = useState(true);

  useEffect(() => {
  async function fetchSetores() {
    try {
      const res = await fetch(`${API_URL}/api/setores`);

      if (!res.ok) {
        throw new Error(`Erro ao buscar setores: ${res.status}`);
      }

      const data = await res.json();
      setSetores(data);
    } catch (err) {
      console.error("Erro ao buscar setores:", err);
      setSetores([]); // garante que fica um array vazio, evitando o crash do .map
    } finally {
      setCarregandoSetores(false);
    }
  }
  fetchSetores();
}, []);
  const set = (field) => (value) => {
    setForm((p) => ({ ...p, [field]: value }));
    if (errors[field]) setErrors((p) => ({ ...p, [field]: undefined }));
  };

  const handleSelectSala = (salaId) => {
    setForm((p) => ({ ...p, sala: salaId, data: "", hora_inicio: "", hora_fim: "" }));
    setSelectedSlot(null);
    setErrors((p) => ({ ...p, sala: undefined, data: undefined, hora_inicio: undefined }));
  };

  const handleSelectDate = (date) => {
    setForm((p) => ({ ...p, data: date, hora_inicio: "", hora_fim: "" }));
    setSelectedSlot(null);
    if (errors.data) setErrors((p) => ({ ...p, data: undefined }));
  };

  const handleSelectSlot = (slot) => {
    setSelectedSlot(slot);
    setForm((p) => ({ ...p, hora_inicio: slot.inicio, hora_fim: slot.fim }));
    if (errors.hora_inicio) setErrors((p) => ({ ...p, hora_inicio: undefined, hora_fim: undefined }));
  };

  const validate = () => {
    const e = {};
    if (!form.nome.trim()) e.nome       = "Nome é obrigatório";
    if (!form.setor)       e.setor      = "Selecione um setor";
    if (!form.assunto)     e.assunto    = "Selecione o tipo de evento";
    if (!form.sala)        e.sala       = "Selecione uma sala";
    if (!form.data)        e.data       = "Selecione uma data no calendário";
    if (!form.hora_inicio) e.hora_inicio = "Selecione um horário disponível";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setEnviando(true);

    try {
      const res = await fetch(`${API_URL}/api/agendamentos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: form.nome,
          setor_id: form.setor,
          assunto: form.assunto,
          sala: form.sala,
          data: form.data,
          hora_inicio: form.hora_inicio,
          hora_fim: form.hora_fim,
          observacoes: form.observacoes,
        }),
      });

      if (!res.ok) throw new Error("Falha ao salvar agendamento");

      setSubmitted(true);
    } catch (err) {
      console.error(err);
      setErrors((p) => ({ ...p, geral: "Não foi possível confirmar a reserva. Tente novamente." }));
    } finally {
      setEnviando(false);
    }
  };

  const handleReset = () => {
    setForm(EMPTY_FORM);
    setErrors({});
    setSelectedSlot(null);
    setSubmitted(false);
  };

  const isHall       = form.sala === "hall";
  const selectedSala = SALAS.find((s) => s.id === form.sala);

  return (
    <div className={styles.page}>
      <Header />

      {submitted ? (
        <div className={styles.successWrapper}>
          <div className={styles.successBox}>
            <SuccessScreen onReset={handleReset} />
          </div>
        </div>
      ) : (
        <main className={styles.main}>
          <div className={styles.container}>
            <div>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionHeaderRow}>
                  <div className={styles.sectionHeaderLine} />
                  <span className={styles.sectionHeaderLabel}>Formulário</span>
                </div>
                <h2 className={styles.sectionTitle}>Dados do agendamento</h2>
              </div>

              <form onSubmit={handleSubmit} noValidate className={styles.form}>

                {/* Responsável */}
                <div className={styles.card}>
                  <p className={styles.cardLabel}>Responsável</p>
                  <InputField label="Nome completo" icon={User} value={form.nome}
                    onChange={set("nome")} placeholder="Ex: Ana Beatriz Silva" error={errors.nome} />
                  <SelectField
                    label="Setor"
                    icon={Tag}
                    value={form.setor}
                    onChange={set("setor")}
                    options={setores.map((s) => ({ value: s.id, label: s.nome }))}
                    placeholder={carregandoSetores ? "Carregando..." : "Selecione o setor"}
                    error={errors.setor}
                  />
                </div>

                {/* Tipo de evento */}
                <div className={styles.card}>
                  <p className={styles.cardLabel}>Tipo de evento</p>
                  <SelectField label="Assunto / finalidade" icon={Tag} value={form.assunto}
                    onChange={set("assunto")} options={ASSUNTOS}
                    placeholder="Selecione o tipo de evento" error={errors.assunto} />
                </div>

                {/* Salas */}
                <div className={`${styles.card} ${styles.cardTight}`}>
                  <p className={styles.cardLabel}>Sala</p>
                  <div className={styles.salasGrid}>
                    {SALAS.map((sala) => (
                      <SalaCard key={sala.id} sala={sala}
                        selected={form.sala === sala.id}
                        onSelect={() => handleSelectSala(sala.id)} />
                    ))}
                  </div>
                  {errors.sala && (
                    <p className={styles.errorText}>
                      <AlertCircle size={11} /> {errors.sala}
                    </p>
                  )}
                </div>

                {/* Calendário */}
                <div className={`${styles.calendarCard} ${!form.sala ? styles.calendarCardDisabled : ""}`}>
                  <div className={styles.calendarHeader}>
                    <div className={styles.calendarHeaderRow}>
                      <div className={styles.calendarHeaderLine} />
                      <span className={styles.calendarHeaderLabel}>Disponibilidade</span>
                    </div>
                    <p className={styles.calendarTitle}>
                      Selecione data e horário
                      {selectedSala && (
                        <span className={styles.calendarTitleSala}>
                          — {selectedSala.name}
                        </span>
                      )}
                    </p>
                  </div>

                  {!form.sala && (
                    <div className={styles.infoBox}>
                      <Info size={14} className={styles.infoIcon} />
                      <p className={styles.infoText}>Selecione uma sala acima para liberar o calendário.</p>
                    </div>
                  )}

                  {form.data && (
                    <div className={`${styles.dateSummary} ${form.hora_inicio ? styles.dateSummarySelected : ""}`}>
                      <Calendar size={14} className={form.hora_inicio ? styles.dateSummaryIconSelected : styles.dateSummaryIcon} />
                      <div className={styles.dateSummaryContent}>
                        <p className={styles.dateSummaryDate}>
                          {new Date(form.data + "T00:00:00").toLocaleDateString("pt-BR", {
                            weekday: "long", day: "2-digit", month: "long", year: "numeric",
                          })}
                        </p>
                        {form.hora_inicio ? (
                          <p className={styles.dateSummaryTime}>
                            {form.hora_inicio} – {form.hora_fim}
                          </p>
                        ) : (
                          <p className={styles.dateSummaryHint}>Selecione um horário abaixo</p>
                        )}
                      </div>
                      {form.hora_inicio && <CheckCircle2 size={14} className={styles.dateSummaryCheck} />}
                    </div>
                  )}

                  <CalendarPanel
                    selectedDate={form.data}
                    onSelectDate={handleSelectDate}
                    selectedSlot={selectedSlot}
                    onSelectSlot={handleSelectSlot}
                    isHall={isHall}
                  />

                  {errors.data && (
                    <p className={`${styles.errorText} ${styles.errorTextMt3}`}>
                      <AlertCircle size={11} /> {errors.data}
                    </p>
                  )}
                  {errors.hora_inicio && (
                    <p className={`${styles.errorText} ${styles.errorTextMt1}`}>
                      <AlertCircle size={11} /> {errors.hora_inicio}
                    </p>
                  )}
                </div>

                {/* Observações */}
                <div className={styles.card}>
                  <p className={styles.cardLabel}>Observações</p>
                  <div className={styles.textareaWrapper}>
                    <label className={styles.textareaLabel}>
                      Informações adicionais (opcional)
                    </label>
                    <textarea
                      value={form.observacoes}
                      onChange={(e) => set("observacoes")(e.target.value)}
                      placeholder="Ex: necessidade de projetor, microfone, disposição das cadeiras…"
                      rows={3}
                      className={styles.textarea}
                    />
                  </div>
                </div>

                {errors.geral && (
                  <p className={styles.errorText}>
                    <AlertCircle size={11} /> {errors.geral}
                  </p>
                )}

                {/* Submit */}
                <div className={styles.submitRow}>
                  <p className={styles.capacityText}>
                    {selectedSala ? `Capacidade: ${selectedSala.capacity} pessoas` : "Selecione uma sala"}
                  </p>
                  <button type="submit" className={styles.submitButton} disabled={enviando}>
                    <CheckCircle2 size={15} />
                    {enviando ? "Enviando..." : "Confirmar reserva"}
                  </button>
                </div>

              </form>
            </div>
          </div>
        </main>
      )}
              <Footer />

    </div>
  );
};

export default Home;