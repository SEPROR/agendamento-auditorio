import { useState, useEffect } from "react";
import { Calendar, User, Tag, CheckCircle2, AlertCircle, Info, Mail } from "lucide-react";
import { ASSUNTOS, HOUR_START, HOUR_END } from "../../constants.js";
import { findConflict, toMinutes } from "../../helpers";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import SelectField from "../../components/SelectField";
import InputField from "../../components/InputField";
import SalaCard from "../../components/SalaCard";
import CalendarPanel from "../../components/CalendarPanel";
import SuccessScreen from "../../components/SuccessScreen";
import styles from "./index.module.css";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const EMPTY_FORM = {
  nome: "", email: "", setor: "", assunto: "", sala: "",
  data: "", hora_inicio: "", hora_fim: "", observacoes: "",
};

const Home = () => {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  // const [selectedSlot, setSelectedSlot] = useState(null);
  const [enviando, setEnviando] = useState(false);

  // Dados vindos do backend
  const [setores, setSetores] = useState([]);
  const [tipo, setTipo] = useState([]);
  const [salas, setSalas] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [carregandoSetores, setCarregandoSetores] = useState(true);
  const [carregandoTipo, setCarregandoTipo] = useState(true);
  const [carregandoSalas, setCarregandoSalas] = useState(true);
  const [carregandoUsuario, setCarregandoUsuario] = useState(true); // NOVO

  // NOVO: busca o usuário logado no AD e preenche o nome (travado)
  useEffect(() => {
    async function fetchUsuarioLogado() {
      try {
        const res = await fetch(`${API_URL}/api/auth/status`, {
          credentials: "include" // envia o cookie de sessão
        });

        // Esse backend responde 401 quando não há sessão — é esperado, não é erro de rede
        if (res.status === 401) {
          window.location.href = "/login";
          return;
        }

        if (!res.ok) throw new Error(`Erro ao buscar usuário: ${res.status}`);

        const data = await res.json();

        if (data.autenticado && data.usuario) {
          setForm((p) => ({ ...p, nome: data.usuario }));
        } else {
          window.location.href = "/login";
        }
      } catch (err) {
        console.error("Erro ao buscar usuário logado:", err);
        setErrors((p) => ({ ...p, geral: "Não foi possível identificar o usuário logado." }));
      } finally {
        setCarregandoUsuario(false);
      }
    }
    fetchUsuarioLogado();
  }, []);

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

  useEffect(() => {
    async function fetchTipo() {
      try {
        const res = await fetch(`${API_URL}/api/tipo`);

        if (!res.ok) {
          throw new Error(`Erro ao buscar Tipo: ${res.status}`);
        }

        const data = await res.json();
        setTipo(data);
      } catch (err) {
        console.error("Erro ao buscar tipo:", err);
        setTipo([]); // garante que fica um array vazio, evitando o crash do .map
      } finally {
        setCarregandoTipo(false);
      }
    }
    fetchTipo();
  }, []);

  useEffect(() => {
    async function fetchSalas() {
      try {
        const res = await fetch(`${API_URL}/api/salas`);

        if (!res.ok) {
          throw new Error(`Erro ao buscar salas: ${res.status}`);
        }

        const data = await res.json();
        setSalas(data);
      } catch (err) {
        console.error("Erro ao buscar salas:", err);
        setSalas([]); // garante que fica um array vazio, evitando o crash do .map
      } finally {
        setCarregandoSalas(false);
      }
    }
    fetchSalas();
  }, []);


    // ALTERADO: a busca de agendamentos virou uma função reutilizável,
  //    para poder recarregar a lista quando o backend responder conflito (409).
  const carregarBookings = async (salaId) => {
    if (!salaId) {
      setBookings([]);
      return;
    }
    try {
      const res = await fetch(`${API_URL}/api/agendamentos?sala_id=${salaId}`);
 
      if (!res.ok) {
        throw new Error(`Erro ao buscar agendamentos: ${res.status}`);
      }
 
      const data = await res.json();
      setBookings(data);
    } catch (err) {
      console.error("Erro ao buscar agendamentos:", err);
      setBookings([]);
    }
  };


  // Busca os agendamentos da sala selecionada, para popular o calendário
  useEffect(() => {
    if (!form.sala) {
      setBookings([]);
      return;
    }

    async function fetchBookings() {
      try {
        const res = await fetch(`${API_URL}/api/agendamentos?sala_id=${form.sala}`);

        if (!res.ok) {
          throw new Error(`Erro ao buscar agendamentos: ${res.status}`);
        }

        const data = await res.json();
        setBookings(data);
      } catch (err) {
        console.error("Erro ao buscar agendamentos:", err);
        setBookings([]);
      }
    }
    fetchBookings();
  }, [form.sala]);

  const set = (field) => (value) => {
    setForm((p) => ({ ...p, [field]: value }));
    if (errors[field]) setErrors((p) => ({ ...p, [field]: undefined }));
  };

  const handleSelectSala = (salaId) => {
    setForm((p) => ({ ...p, sala: salaId, data: "", hora_inicio: "", hora_fim: "" }));
    setErrors((p) => ({ ...p, sala: undefined, data: undefined, hora_inicio: undefined }));
  };

  const handleSelectDate = (date) => {
    setForm((p) => ({ ...p, data: date, hora_inicio: "", hora_fim: "" }));
    if (errors.data) setErrors((p) => ({ ...p, data: undefined }));
  };

  // const handleSelectSlot = (slot) => {
  //   setSelectedSlot(slot);
  //   setForm((p) => ({ ...p, hora_inicio: slot.inicio, hora_fim: slot.fim }));
  //   if (errors.hora_inicio) setErrors((p) => ({ ...p, hora_inicio: undefined, hora_fim: undefined }));
  // };

  const handleChangeHora = (field, value) => {
    setForm((p) => ({ ...p, [field]: value }));
    setErrors((p) => ({ ...p, hora_inicio: undefined, hora_fim: undefined }));
  };

  const validate = () => {
    const e = {};
    if (!form.nome.trim()) e.nome = "Nome é obrigatório";
    if (!form.email.trim()) {
      e.email = "E-mail é obrigatório";
    } else if (!EMAIL_REGEX.test(form.email.trim())) {
      e.email = "Informe um e-mail válido";
    }
    if (!form.setor) e.setor = "Selecione um setor";
    if (!form.assunto) e.assunto = "Selecione o tipo de evento";
    if (!form.sala) e.sala = "Selecione uma sala";
    if (!form.data) e.data = "Selecione uma data no calendário";

    //    ordem, expediente e conflito com reservas já existentes.
    if (!form.hora_inicio || !form.hora_fim) {
      e.hora_inicio = "Informe o horário de início e de término";
    } else if (toMinutes(form.hora_fim) <= toMinutes(form.hora_inicio)) {
      e.hora_inicio = "O término deve ser depois do início";
    } else if (
      toMinutes(form.hora_inicio) < HOUR_START * 60 ||
      toMinutes(form.hora_fim) > HOUR_END * 60
    ) {
      e.hora_inicio = "Horário fora do expediente";
    } else if (form.data && findConflict(bookings, form.data, form.hora_inicio, form.hora_fim)) {
      e.hora_inicio = "Esse horário conflita com uma reserva existente";
    }
 
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setEnviando(true);
    setErrors((p) => ({ ...p, geral: undefined }));

    try {
      const res = await fetch(`${API_URL}/api/agendamentos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // envia o cookie de sessão — necessário agora que a rota exige login
        body: JSON.stringify({
          nome: form.nome,
          email: form.email,
          setor_id: form.setor,
          assunto: form.assunto,
          sala: form.sala,
          data: form.data,
          hora_inicio: form.hora_inicio,
          hora_fim: form.hora_fim,
          observacoes: form.observacoes,
        }),
      });

      if (!res.ok) {
        const erroBody = await res.json().catch(() => null);
        // ALTERADO: guarda o status no erro para tratar o 409 (conflito) no catch
        const erro = new Error(erroBody?.erro || "Falha ao salvar agendamento");
        erro.status = res.status;
        throw erro;
      }

      // sucesso
      setSubmitted(true);

       //ALTERADO: usa a função reutilizável
      await carregarBookings(form.sala);
    } catch (err) {
      console.error(err);
      setErrors((p) => ({ ...p, geral: err.message || "Não foi possível confirmar a reserva. Tente novamente." }));
 
      // ➕ NOVO: se alguém reservou o mesmo horário antes, recarrega a lista
      //    para o usuário ver o que ficou ocupado
      if (err.status === 409) {
        await carregarBookings(form.sala);
      }
    } finally {
      setEnviando(false);
    }
  };

  const handleReset = () => {
    // Mantém o nome do usuário logado ao resetar o form
    setForm((p) => ({ ...EMPTY_FORM, nome: p.nome }));
    setErrors({});
    setSubmitted(false);
  };

  const selectedSala = salas.find((s) => s.id === form.sala);
  const isHall = selectedSala?.nome === "Hall";

  // ➕ NOVO: true quando início e término já estão preenchidos
  const horarioCompleto = Boolean(form.hora_inicio && form.hora_fim);

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
                {/* <h2 className={styles.sectionTitle}>Dados do agendamento</h2> */}
              </div>

              <form onSubmit={handleSubmit} noValidate className={styles.form}>

                {/* Responsável */}
                <div className={styles.card}>
                  <p className={styles.cardLabel}>Responsável</p>
                  <InputField
                    label="Nome completo"
                    icon={User}
                    value={form.nome}
                    onChange={set("nome")}
                    placeholder={carregandoUsuario ? "Carregando..." : "Ex: Ana Beatriz Silva"}
                    error={errors.nome}
                    readOnly
                    disabled={carregandoUsuario}
                  />

                  <SelectField
                    label="Setor"
                    icon={Tag}
                    value={form.setor}
                    onChange={set("setor")}
                    options={setores.map((s) => ({ value: s.id, label: s.nome }))}
                    placeholder={carregandoSetores ? "Carregando..." : "Selecione o setor"}
                    error={errors.setor}
                  />

                  <InputField label="E-mail" icon={Mail} type="email" value={form.email}
                    onChange={set("email")} placeholder="Ex: ana.silva@gmail.com" error={errors.email} />

                </div>

                {/* Tipo de evento  */}
                 <div className={styles.card}>
                  <p className={styles.cardLabel}>Tipo de evento</p>
                  <SelectField
                    label="Assunto / finalidade"
                    icon={Tag}
                    value={form.assunto}
                    onChange={set("assunto")}
                    options={tipo.map((t) => ({ value: t.id, label: t.tipo }))}
                    placeholder={carregandoTipo ? "Carregando..." : "Selecione o tipo de evento"}
                    error={errors.assunto}
                  />
                </div>

                {/* Salas */}
                <div className={`${styles.card} ${styles.cardTight}`}>
                  <p className={styles.cardLabel}>Sala</p>
                  <div className={styles.salasGrid}>
                    {salas.map((sala) => (
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
                    </div>
                    <p className={styles.calendarTitle}>
                      {/* ✏️ ALTERADO: texto do título (antes: "Selecione data e horário") */}
                      Selecione a data e informe o horário
                      {selectedSala && (
                        <span className={styles.calendarTitleSala}>
                          — {selectedSala.nome}
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
                    // ✏️ ALTERADO: usa horarioCompleto (início E término) em vez de só hora_inicio
                    <div className={`${styles.dateSummary} ${horarioCompleto ? styles.dateSummarySelected : ""}`}>
                      <Calendar size={14} className={horarioCompleto ? styles.dateSummaryIconSelected : styles.dateSummaryIcon} />
                      <div className={styles.dateSummaryContent}>
                        <p className={styles.dateSummaryDate}>
                          {new Date(form.data + "T00:00:00").toLocaleDateString("pt-BR", {
                            weekday: "long", day: "2-digit", month: "long", year: "numeric",
                          })}
                        </p>
                        {horarioCompleto ? (
                          <p className={styles.dateSummaryTime}>
                            {form.hora_inicio} – {form.hora_fim}
                          </p>
                        ) : (
                          // ✏️ ALTERADO: texto da dica (antes: "Selecione um horário abaixo")
                          <p className={styles.dateSummaryHint}>Informe o início e o término abaixo</p>
                        )}
                      </div>
                      {horarioCompleto && <CheckCircle2 size={14} className={styles.dateSummaryCheck} />}
                    </div>
                  )}
 
                  {/* ✏️ ALTERADO: props novas (horaInicio, horaFim, onChangeHora)
                      ❌ REMOVIDAS: selectedSlot e onSelectSlot */}
                  <CalendarPanel
                    selectedDate={form.data}
                    onSelectDate={handleSelectDate}
                    horaInicio={form.hora_inicio}
                    horaFim={form.hora_fim}
                    onChangeHora={handleChangeHora}
                    isHall={isHall}
                    bookings={bookings}
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
                    {selectedSala ? `Capacidade: ${selectedSala.capacidade} pessoas` : "Selecione uma sala"}
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