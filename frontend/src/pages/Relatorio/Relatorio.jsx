import { useState, useEffect, useMemo, useCallback } from "react";
import StatsGrid from "../../components/StatsGrid";
import HistoricoFilters from "../../components/HistoricoFilters";
import HistoricoTable from "../../components/HistoricoTable";
import Pagination from "../../components/Pagination";
import SolicitacaoModal from "../../components/SolicitacaoModal";
import styles from "./index.module.css";

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:2999';

const PAGE_SIZE = 6;

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const TODOS_MOTORISTAS = "Todos os Motoristas";
const TODOS_STATUS = "Todos os Status";
const TODOS_PERIODOS = "Todos os Períodos";

function mapearSolicitacao(s) {
  return {
    id: s.id,
    solicitante: s.usuario_nome || "—",
    setor: s.setor_nome || "—",
    destino: s.destino || "—",
    motorista: s.motorista_nome || "—",
    dataPartida: s.data
      ? new Date(s.data).toLocaleDateString("pt-BR", { timeZone: "America/Manaus" })
      : "—",
    horaPartida: s.hora || "—",
    abertaEm: s.data_abertura ? new Date(s.data_abertura).toLocaleString("pt-BR") : "—",
    aberturaRaw: s.data_abertura,
    fechadaEm: s.data_fechamento ? new Date(s.data_fechamento).toLocaleString("pt-BR") : "—",
    fechadaEmRaw: s.data_fechamento,
    dataPartidaRaw: s.data,
    status: s.status,
    ocorrencia: s.problema || "Não informado",
    motoristaAnterior: s.motorista_anterior_nome || null,
  };
}

function gerarHtmlPdf(lista, filtrosAtuais) {
  const statusCores = {
    fechado: { bg: "#d1fae5", cor: "#065f46", label: "Fechado" },
    em_andamento: { bg: "#fef3c7", cor: "#92400e", label: "Em Andamento" },
    aberto: { bg: "#fee2e2", cor: "#991b1b", label: "Aberto" },
  };

  const fec = lista.filter((s) => s.status === "fechado").length;
  const em_ = lista.filter((s) => s.status === "em_andamento").length;
  const abe = lista.filter((s) => s.status === "aberto").length;

  const linhas = lista
    .map((s) => {
      const st = statusCores[s.status] || { bg: "#e5e7eb", cor: "#374151", label: s.status };
      return `<tr>
<td>#${s.id}</td><td>${s.abertaEm}</td><td>${s.solicitante}</td><td>${s.setor}</td><td>${s.destino}</td><td>${s.ocorrencia}</td><td>${s.motorista}</td>
<td style="white-space:nowrap">${s.dataPartida} ${s.horaPartida}</td>
<td style="white-space:nowrap">${s.fechadaEm}</td>
<td><span style="padding:2px 8px;border-radius:9999px;font-size:11px;font-weight:600;background:${st.bg};color:${st.cor}">${st.label}</span></td></tr>`;
    })
    .join("");

  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Relatório</title>
<style>body{font-family:Arial,sans-serif;font-size:12px;color:#1a2332;margin:0;padding:24px}.hdr{display:flex;justify-content:space-between;border-bottom:2px solid #2196a6;padding-bottom:12px;margin-bottom:18px}.hdr h1{font-size:17px;margin:4px 0 0;color:#2196a6}.hdr .org{font-size:10px;color:#6b7a8d;text-align:right}.fbox{background:#f0f9ff;border:1px solid #bae6fd;border-radius:6px;padding:9px 13px;margin-bottom:16px;font-size:11px;color:#0c4a6e}.fbox span{margin-right:16px}table{width:100%;border-collapse:collapse}th{background:#2196a6;color:#fff;text-align:left;padding:6px 8px;font-size:10px;text-transform:uppercase;letter-spacing:.05em}td{padding:5px 8px;border-bottom:1px solid #e2e8f0;font-size:11px}tr:nth-child(even) td{background:#f8fafc}.foot{margin-top:20px;font-size:10px;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:9px}.totals{font-weight:bold;margin-bottom:4px}@media print{body{padding:0}}</style></head><body>
<div class="hdr"><div><div style="font-size:10px;color:#6b7a8d">GOVERNO DO ESTADO DO AMAZONAS</div><h1>Relatório de Histórico de Solicitações de Transporte</h1></div><div class="org">Secretaria de Produção Rural<br/>Gerado em: ${new Date().toLocaleString("pt-BR")}</div></div>
<div class="fbox"><strong>Filtros aplicados: </strong><span>Motorista: ${filtrosAtuais.motorista}</span><span>Status: ${filtrosAtuais.status}</span><span>Período: ${filtrosAtuais.periodo}</span><span>Total: ${lista.length} registro(s)</span></div>
<table><thead><tr><th>#</th><th>Aberta em</th><th>Solicitante</th><th>Setor</th><th>Destino</th><th>Ocorrência</th><th>Motorista</th><th>Saída</th><th>Encerrada em</th><th>Status</th></tr></thead><tbody>${linhas}</tbody></table>
<div class="foot"><div class="totals">Fechadas: ${fec}</div><div class="totals">Em Andamento: ${em_}</div><div class="totals">Abertas: ${abe}</div> Secretaria de Produção Rural — Sistema de Gerenciamento de Transporte</div>
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
  const [motoristasOptions, setMotoristasOptions] = useState([]);
  const [estado, setEstado] = useState("loading"); // loading | ok | error

  const [busca, setBusca] = useState("");
  const [motorista, setMotorista] = useState(TODOS_MOTORISTAS);
  const [status, setStatus] = useState(TODOS_STATUS);
  const [periodo, setPeriodo] = useState(TODOS_PERIODOS);

  const [paginaAtual, setPaginaAtual] = useState(1);
  const [detalheAtual, setDetalheAtual] = useState(null);

  const carregarDados = useCallback(async () => {
    setEstado("loading");
    try {
      const response = await fetch(`${API_BASE_URL}/api/solicitacao`);
      if (!response.ok) throw new Error("Falha ao buscar solicitações");
      const todas = await response.json();

      const mapeadas = todas
        .map(mapearSolicitacao)
        .sort((a, b) => new Date(b.aberturaRaw || 0) - new Date(a.aberturaRaw || 0));

      setDados(mapeadas);
      setPaginaAtual(1);
      setEstado("ok");

      try {
        const respMot = await fetch(`${API_BASE_URL}/api/motoristas`);
        const motoristasApi = await respMot.json();
        setMotoristasOptions(motoristasApi.map((m) => m.nome));
      } catch {
        // fallback: usa os nomes já presentes no histórico
        setMotoristasOptions([
          ...new Set(mapeadas.map((d) => d.motorista).filter((m) => m && m !== "—")),
        ]);
      }
    } catch (error) {
      console.error("Erro ao carregar histórico:", error);
      setEstado("error");
    }
  }, []);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  // periodosOptions no formato exigido pelo HistoricoFilters: [{ chave, label }]
  const periodosOptions = useMemo(() => {
    const mapa = new Map();
    dados.forEach((d) => {
      if (!d.dataPartidaRaw) return;
      const [ano, mes] = d.dataPartidaRaw.substring(0, 7).split("-");
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
    return dados.filter((s) => {
      if (motorista !== TODOS_MOTORISTAS && s.motorista !== motorista) return false;
      if (status !== TODOS_STATUS && s.status !== status) return false;
      if (periodo !== TODOS_PERIODOS) {
        const chave = s.dataPartidaRaw
          ? s.dataPartidaRaw.substring(0, 7).split("-").reverse().join("/")
          : "";
        if (chave !== periodo) return false;
      }
      if (
        buscaLower &&
        !`${s.solicitante} ${s.destino} ${s.setor} #${s.id}`.toLowerCase().includes(buscaLower)
      )
        return false;
      return true;
    });
  }, [dados, busca, motorista, status, periodo]);

  // Reseta a página sempre que os filtros mudam o resultado
  useEffect(() => {
    setPaginaAtual(1);
  }, [busca, motorista, status, periodo]);

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / PAGE_SIZE));
  const paginaSegura = Math.min(paginaAtual, totalPaginas);

  const paginaDados = useMemo(
    () => filtrados.slice((paginaSegura - 1) * PAGE_SIZE, paginaSegura * PAGE_SIZE),
    [filtrados, paginaSegura]
  );

  const tableCountLabel = `${filtrados.length} registro${filtrados.length !== 1 ? "s" : ""} encontrado${filtrados.length !== 1 ? "s" : ""}`;

  const limparFiltros = useCallback(() => {
    setBusca("");
    setMotorista(TODOS_MOTORISTAS);
    setStatus(TODOS_STATUS);
    setPeriodo(TODOS_PERIODOS);
  }, []);

  const abrirModal = useCallback(
    (id) => {
      const s = dados.find((d) => d.id === id);
      if (!s) return;
      setDetalheAtual(s);
    },
    [dados]
  );

  const fecharModal = useCallback(() => setDetalheAtual(null), []);

  const filtrosAtuaisLabel = { motorista, status, periodo };

  const handleGerarPdf = useCallback(() => {
    abrirJanelaPdf(filtrados, filtrosAtuaisLabel);
  }, [filtrados, motorista, status, periodo]);

  const handleExportarPdfModal = useCallback(
    (solicitacao) => {
      if (solicitacao) abrirJanelaPdf([solicitacao], filtrosAtuaisLabel);
    },
    [motorista, status, periodo]
  );

  return (
    <main id="principal" className={styles.container}>
      <div className={styles.pageTitleRow}>
        <div>
          <h1>Histórico de Solicitações</h1>
          <p>Registros encerrados de gerenciamento de transporte</p>
        </div>
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

      <StatsGrid filtrados={filtrados} totalGeral={dados.length} />

      <HistoricoFilters
        busca={busca}
        onBuscaChange={setBusca}
        motorista={motorista}
        onMotoristaChange={setMotorista}
        status={status}
        onStatusChange={setStatus}
        periodo={periodo}
        onPeriodoChange={setPeriodo}
        motoristasOptions={motoristasOptions}
        periodosOptions={periodosOptions}
        onLimpar={limparFiltros}
      />

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
      />
    </main>
  );
}
