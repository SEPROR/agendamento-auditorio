import { useState, useEffect, useMemo, useCallback } from "react";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
// import StatsGrid from "../../components/StatsGrid";
import HistoricoFilters from "../../components/HistoricoFilters";
import HistoricoTable from "../../components/HistoricoTable";
import Pagination from "../../components/Pagination";
import SolicitacaoModal from "../../components/SolicitacaoModal";
import styles from "./index.module.css";

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const PAGE_SIZE = 6;

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const TODAS_SALAS = "Todas as Salas";
const TODOS_STATUS = "Todos os Status";
const TODOS_PERIODOS = "Todos os Períodos";
const STATUS_OPTIONS = ["Confirmado", "Cancelado", "Desmarcado"];

function mapearAgendamento(a) {
  return {
    id: a.id,
    solicitante: a.solicitante || "—",
    setor: a.setor || "—",
    sala: a.sala || "—",
    assunto: a.assunto || "—",
    data: a.data
      ? new Date(a.data + "T00:00:00").toLocaleDateString("pt-BR")
      : "—",
    horaInicio: a.hora_inicio || "—",
    horaFim: a.hora_fim || "—",
    dataRaw: a.data,
    observacoes: a.observacoes || "Nenhuma observação",
    status: a.status || "confirmado",
  };
}

const STATUS_LABEL = { confirmado: "Confirmado", cancelado: "Cancelado", desmarcado: "Desmarcado" };

function gerarHtmlPdf(lista, filtrosAtuais) {
  const linhas = lista
    .map((a) => {
      const st = STATUS_LABEL[a.status] ? a.status : "confirmado";
      return `<tr>
<td>#${a.id}</td><td>${a.solicitante}</td><td>${a.setor}</td><td>${a.sala}</td>
<td style="white-space:nowrap">${a.data}</td>
<td style="white-space:nowrap">${a.horaInicio} – ${a.horaFim}</td>
<td><span class="st st-${st}">${STATUS_LABEL[st]}</span></td></tr>`;
    })
    .join("");

  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Relatório</title>
<style>body{font-family:Arial,sans-serif;font-size:12px;color:#1a2332;margin:0;padding:24px}.hdr{display:flex;justify-content:space-between;border-bottom:2px solid #2196a6;padding-bottom:12px;margin-bottom:18px}.hdr h1{font-size:17px;margin:4px 0 0;color:#2196a6}.hdr .org{font-size:10px;color:#6b7a8d;text-align:right}.fbox{background:#f0f9ff;border:1px solid #bae6fd;border-radius:6px;padding:9px 13px;margin-bottom:16px;font-size:11px;color:#0c4a6e}.fbox span{margin-right:16px}table{width:100%;border-collapse:collapse}th{background:#2196a6;color:#fff;text-align:left;padding:6px 8px;font-size:10px;text-transform:uppercase;letter-spacing:.05em}td{padding:5px 8px;border-bottom:1px solid #e2e8f0;font-size:11px}tr:nth-child(even) td{background:#f8fafc}.foot{margin-top:20px;font-size:10px;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:9px}.st{font-weight:700}.st-confirmado{color:#1f7e5b}.st-cancelado{color:#bb3232}.st-desmarcado{color:#b45309}@media print{body{padding:0}}</style></head><body>
<div class="hdr"><div><div style="font-size:10px;color:#6b7a8d">GOVERNO DO ESTADO DO AMAZONAS</div><h1>Relatório de Agendamentos de Sala</h1></div><div class="org">Secretaria de Produção Rural<br/>Gerado em: ${new Date().toLocaleString("pt-BR")}</div></div>
<div class="fbox"><strong>Filtros aplicados: </strong><span>Sala: ${filtrosAtuais.sala}</span><span>Status: ${filtrosAtuais.status}</span><span>Período: ${filtrosAtuais.periodo}</span><span>Total: ${lista.length} registro(s)</span></div>
<table><thead><tr><th>#</th><th>Solicitante</th><th>Setor</th><th>Sala</th><th>Data</th><th>Horário</th><th>Status</th></tr></thead><tbody>${linhas}</tbody></table>
<div class="foot">Secretaria de Produção Rural — Sistema de Agendamento de Auditórios</div>
</body></html>`;
}

function abrirJanelaPdf(lista, filtrosAtuais) {
  const html = gerarHtmlPdf(lista, filtrosAtuais);
  const w = window.open("", "_blank");
  if (!w) {
    alert("Habilite pop-ups para gerar o PDF.");
    return;
  }
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 400);
}

export default function Relatorio() {
  const [dados, setDados] = useState([]);
  const [salasOptions, setSalasOptions] = useState([]);
  const [estado, setEstado] = useState("loading"); // loading | ok | error

  const [busca, setBusca] = useState("");
  const [sala, setSala] = useState(TODAS_SALAS);
  const [statusSel, setStatusSel] = useState(TODOS_STATUS);
  const [periodo, setPeriodo] = useState(TODOS_PERIODOS);

  const [paginaAtual, setPaginaAtual] = useState(1);
  const [detalheAtual, setDetalheAtual] = useState(null);

  // Permissão para desmarcar (vem do backend, a partir do login no AD)
  const [podeDesmarcar, setPodeDesmarcar] = useState(false);
  const [desmarcando, setDesmarcando] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/auth/status`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setPodeDesmarcar(!!d?.podeDesmarcar))
      .catch(() => { });
  }, []);

  const carregarDados = useCallback(async () => {
    setEstado("loading");
    try {
      const response = await fetch(`${API_BASE_URL}/api/agendamentos/relatorio`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Falha ao buscar agendamentos");
      const todos = await response.json();

      const mapeados = todos
        .map(mapearAgendamento)
        .sort((a, b) => new Date(b.dataRaw || 0) - new Date(a.dataRaw || 0));

      setDados(mapeados);
      setPaginaAtual(1);
      setEstado("ok");

      setSalasOptions([...new Set(mapeados.map((d) => d.sala).filter((s) => s && s !== "—"))]);
    } catch (error) {
      console.error("Erro ao carregar relatório:", error);
      setEstado("error");
    }
  }, []);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  const periodosOptions = useMemo(() => {
    const mapa = new Map();
    dados.forEach((d) => {
      if (!d.dataRaw) return;
      const [ano, mes] = d.dataRaw.substring(0, 7).split("-");
      const chave = `${mes}/${ano}`;
      if (!mapa.has(chave)) mapa.set(chave, `${MESES[parseInt(mes, 10) - 1]} ${ano}`);
    });
    return [...mapa.entries()]
      .sort((a, b) => {
        const [ma, aa] = a[0].split("/");
        const [mb, ab] = b[0].split("/");
        return new Date(ab, mb) - new Date(aa, ma);
      })
      .map(([chave, label]) => ({ chave, label }));
  }, [dados]);

  const filtrados = useMemo(() => {
    const buscaLower = busca.toLowerCase();
    return dados.filter((a) => {
      if (sala !== TODAS_SALAS && a.sala !== sala) return false;
      if (statusSel !== TODOS_STATUS && (STATUS_LABEL[a.status] ?? "Confirmado") !== statusSel) return false;
      if (periodo !== TODOS_PERIODOS) {
        const chave = a.dataRaw
          ? a.dataRaw.substring(0, 7).split("-").reverse().join("/")
          : "";
        if (chave !== periodo) return false;
      }
      if (
        buscaLower &&
        !`${a.solicitante} ${a.setor} ${a.sala} #${a.id}`.toLowerCase().includes(buscaLower)
      )
        return false;
      return true;
    });
  }, [dados, busca, sala, statusSel, periodo]);

  useEffect(() => {
    setPaginaAtual(1);
  }, [busca, sala, statusSel, periodo]);

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / PAGE_SIZE));
  const paginaSegura = Math.min(paginaAtual, totalPaginas);

  const paginaDados = useMemo(
    () => filtrados.slice((paginaSegura - 1) * PAGE_SIZE, paginaSegura * PAGE_SIZE),
    [filtrados, paginaSegura]
  );

  const tableCountLabel = `${filtrados.length} registro${filtrados.length !== 1 ? "s" : ""} encontrado${filtrados.length !== 1 ? "s" : ""}`;

  const limparFiltros = useCallback(() => {
    setBusca("");
    setSala(TODAS_SALAS);
    setTipo(TODOS_TIPOS);
    setPeriodo(TODOS_PERIODOS);
  }, []);

  const abrirModal = useCallback(
    (id) => {
      const a = dados.find((d) => d.id === id);
      if (!a) return;
      setDetalheAtual(a);
    },
    [dados]
  );

  const fecharModal = useCallback(() => setDetalheAtual(null), []);

  // Sem window.confirm/alert: devolve o resultado para o modal exibir na caixa branca
  const desmarcar = useCallback(async (agendamento) => {
    if (!agendamento || agendamento.status !== "confirmado") {
      return { ok: false, erro: "Esta reserva não pode ser desmarcada." };
    }

    setDesmarcando(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/agendamentos/${agendamento.id}/desmarcar`, {
        method: "PATCH",
        credentials: "include",
      });
      const resp = await res.json().catch(() => ({}));
      if (!res.ok) return { ok: false, erro: resp.erro || `Erro ${res.status}` };

      setDados((prev) =>
        prev.map((a) => (a.id === agendamento.id ? { ...a, status: "desmarcado" } : a))
      );

      return { ok: true, emailEnviado: !!resp.emailEnviado };
    } catch (err) {
      return { ok: false, erro: err.message || "Erro ao desmarcar a reserva." };
    } finally {
      setDesmarcando(false);
    }
  }, []);

  const filtrosAtuaisLabel = { sala, statusSel, periodo };

  const handleGerarPdf = useCallback(() => {
    abrirJanelaPdf(filtrados, filtrosAtuaisLabel);
  }, [filtrados, sala, statusSel, periodo]);

  const handleExportarPdfModal = useCallback(
    (agendamento) => {
      if (agendamento) abrirJanelaPdf([agendamento], filtrosAtuaisLabel);
    },
    [sala, statusSel, periodo]
  );

  return (
    <div>
      <Header />
      <main id="principal" className={styles.container}>
        <div className={styles.pageTitleRow}>
          <div>
            <h1>Histórico de Agendamentos</h1>
            <p>Registros de reservas de salas e auditórios</p>
          </div>
        </div>

        {/* <StatsGrid filtrados={filtrados} totalGeral={dados.length} /> */}

        <HistoricoFilters
          busca={busca}
          onBuscaChange={setBusca}
          sala={sala}
          onSalaChange={setSala}
          status={statusSel}
          onStatusChange={setStatusSel}
          periodo={periodo}
          onPeriodoChange={setPeriodo}
          salasOptions={salasOptions}
          statusOptions={STATUS_OPTIONS}
          periodosOptions={periodosOptions}
          onLimpar={limparFiltros}
        />

        <div className={styles.actionsRow}>
          <button className={styles.btnPrimary} onClick={handleGerarPdf}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
            Gerar Relatório PDF
          </button>
        </div>

        <div className={styles.card}>
          <HistoricoTable
            estado={estado}
            itens={paginaDados}
            tableCountLabel={tableCountLabel}
            onAbrirModal={abrirModal}
            onTentarNovamente={carregarDados}
          />

          {estado === "ok" && (
            <Pagination
              paginaAtual={paginaSegura}
              totalPaginas={totalPaginas}
              total={filtrados.length}
              pageSize={PAGE_SIZE}
              onIrPagina={setPaginaAtual}
            />
          )}
        </div>

        <SolicitacaoModal
          solicitacao={detalheAtual}
          onFechar={fecharModal}
          onExportarPDF={handleExportarPdfModal}
          podeDesmarcar={podeDesmarcar}
          desmarcando={desmarcando}
          onDesmarcar={desmarcar}
        />
      </main>
      <Footer />
    </div>
  );
}