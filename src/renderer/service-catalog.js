(function exposeServiceCatalog(global) {
  const entries = new Map([
    [80, ['web', 'HTTP 网站服务', '标准网页服务端口。浏览器通过它访问未加密的网站或本地管理页面。']],
    [443, ['web', 'HTTPS 网站服务', '加密网页服务端口，常见于网站、反向代理和本地管理控制台。']],
    [3000, ['web', '前端开发服务', 'React、Next.js、Vue 或 Grafana 等工具常使用的开发端口。']],
    [3001, ['web', '前端备用服务', '前端开发服务器的常用备用端口。']],
    [4173, ['web', 'Vite 预览', 'Vite 打包后的本地预览服务器。']],
    [4200, ['web', 'Angular 开发服务', 'Angular CLI 默认启动的前端开发服务器。']],
    [5000, ['web', '后端 API', 'Flask、ASP.NET 或其他本地后端常用的 HTTP 端口。']],
    [5173, ['web', 'Vite 开发服务', 'Vite 默认的前端热更新开发服务器。']],
    [5190, ['web', '前端开发服务', '项目自定义的 Vite 或其他前端开发服务器。']],
    [8000, ['web', '后端 API', 'Django、FastAPI、Uvicorn 等开发服务器常用端口。']],
    [8080, ['web', '后端 API', 'Java Web、Tomcat、代理服务和本地控制台常用端口。']],
    [8090, ['web', '后端 API', '项目自定义的后端 HTTP 服务端口。']],
    [8091, ['web', '后台 Worker', '项目自定义的后台任务或 Python Worker HTTP 服务。']],
    [9000, ['web', '应用服务', '应用服务器、PHP-FPM 或管理控制台常用端口。']],
    [1433, ['data', 'SQL Server', 'Microsoft SQL Server 默认数据库端口。']],
    [1521, ['data', 'Oracle 数据库', 'Oracle Database 常用监听端口。']],
    [3306, ['data', 'MySQL', 'MySQL 或 MariaDB 默认关系型数据库端口。']],
    [5432, ['data', 'PostgreSQL', 'PostgreSQL 默认关系型数据库端口，应用会通过它读写业务数据。']],
    [6379, ['data', 'Redis', 'Redis 默认端口，常用于缓存、分布式锁、队列和临时数据。']],
    [9200, ['data', 'Elasticsearch HTTP', 'Elasticsearch 的查询与管理 API 端口。']],
    [9300, ['data', 'Elasticsearch 集群', 'Elasticsearch 节点之间通信使用的端口。']],
    [11211, ['data', 'Memcached', 'Memcached 默认高速缓存端口。']],
    [27017, ['data', 'MongoDB', 'MongoDB 默认文档数据库端口。']],
    [4222, ['message', 'NATS', 'NATS 消息系统的客户端连接端口。']],
    [5672, ['message', 'RabbitMQ', 'RabbitMQ 的 AMQP 消息通信端口。']],
    [15672, ['message', 'RabbitMQ 控制台', 'RabbitMQ 的网页管理控制台。']],
    [9092, ['message', 'Kafka', 'Apache Kafka Broker 的客户端通信端口。']],
    [9876, ['message', 'RocketMQ NameServer', 'RocketMQ 的服务发现和路由注册端口。']],
    [10911, ['message', 'RocketMQ Broker', 'RocketMQ Broker 的消息收发端口。']],
    [2375, ['infra', 'Docker API', '未加密的 Docker 远程 API；对外开放时应特别谨慎。']],
    [2376, ['infra', 'Docker TLS API', '使用 TLS 加密的 Docker 远程管理接口。']],
    [6443, ['infra', 'Kubernetes API', 'Kubernetes 集群控制面的 API 端口。']],
    [7233, ['infra', 'Temporal 服务', 'Temporal 工作流引擎的客户端与 Worker 通信端口。']],
    [8233, ['infra', 'Temporal UI', 'Temporal 工作流的网页查看与管理界面。']],
    [8500, ['infra', 'Consul', 'Consul 服务发现与配置中心的 HTTP 接口。']],
    [9090, ['infra', 'Prometheus', 'Prometheus 监控查询和管理界面。']],
    [9100, ['infra', 'Node Exporter', 'Prometheus 用于采集主机指标的服务。']],
    [7860, ['ai', 'Gradio', '机器学习模型常用的 Gradio 网页交互界面。']],
    [7861, ['ai', 'Gradio', 'Gradio 模型界面的常用备用端口。']],
    [8188, ['ai', 'ComfyUI', 'Stable Diffusion 工作流工具 ComfyUI 的网页端口。']],
    [11434, ['ai', 'Ollama', 'Ollama 本地大模型推理 API 的默认端口。']],
    [1234, ['ai', '本地模型服务', 'LM Studio 等本地模型工具常用的兼容 API 端口。']]
  ]);

  const categoryLabels = {
    web: 'Web 与后端', data: '数据存储', message: '消息中间件',
    infra: '基础设施', ai: 'AI 与模型', other: '其他服务'
  };

  const processRules = [
    [/^system$/i, 'Windows 系统内核进程，负责操作系统底层网络通信，不建议结束。'],
    [/^svchost$/i, 'Windows 服务宿主进程，一个实例可能承载一个或多个系统服务。请结合下方“Windows 服务”判断用途。'],
    [/^javaw?$/i, 'Java 虚拟机进程，通常承载 Spring Boot、Tomcat、开发工具或其他 Java 应用。命令行可帮助确认具体项目。'],
    [/^node$/i, 'Node.js 运行时，通常承载前端开发服务器、构建工具或 JavaScript 后端。'],
    [/^pythonw?$/i, 'Python 运行时，可能是 FastAPI、Flask、任务 Worker、脚本或 AI 模型服务。'],
    [/^postgres$/i, 'PostgreSQL 数据库进程，负责持久化和查询业务数据。'],
    [/^mysqld$/i, 'MySQL 或 MariaDB 数据库服务进程。'],
    [/^redis-server$/i, 'Redis 缓存服务进程。'],
    [/^temporal$/i, 'Temporal 工作流引擎，用于可靠调度长时间运行的业务任务。'],
    [/^ollama$/i, 'Ollama 本地大模型运行服务。'],
    [/^(chrome|msedge|firefox)$/i, '浏览器进程。浏览器有时会开放本地调试、媒体或扩展通信端口。'],
    [/^docker desktop$/i, 'Docker Desktop 后台组件，用于管理本机容器和虚拟化环境。']
  ];

  function classifyService(item) {
    const processName = String(item.processName || '').toLowerCase();
    if (/ollama|llama|vllm|comfy|stable-diffusion/.test(processName)) return { category: 'ai', service: entries.get(Number(item.port))?.[1] || '模型服务' };
    if (/postgres|mysql|redis|mongod|sqlservr|elasticsearch/.test(processName)) return { category: 'data', service: entries.get(Number(item.port))?.[1] || '数据服务' };
    if (/rabbitmq|kafka|nats|rocketmq/.test(processName)) return { category: 'message', service: entries.get(Number(item.port))?.[1] || '消息服务' };
    if (/docker|containerd|kubectl|temporal|prometheus|grafana|consul/.test(processName)) return { category: 'infra', service: entries.get(Number(item.port))?.[1] || '基础设施' };
    const known = entries.get(Number(item.port));
    if (known) return { category: known[0], service: known[1] };
    if (/java|node|python|dotnet|php|ruby|go/.test(processName) && Number(item.port) >= 1024) return { category: 'web', service: '开发服务' };
    return { category: 'other', service: '未分类' };
  }

  function explainService(item, details = {}) {
    const known = entries.get(Number(item.port));
    if (known) return known[2];
    const rule = processRules.find(([pattern]) => pattern.test(item.processName || details.name || ''));
    if (rule) return rule[1];
    if (details.fileDescription || details.productName) {
      const product = details.fileDescription || details.productName;
      const company = details.companyName ? `，由 ${details.companyName} 提供` : '';
      return `${product}${company}。它正在监听本机网络端口，具体用途可结合命令行和文件路径判断。`;
    }
    return '暂未识别这个服务。它可能是应用内部组件或使用了自定义端口，可根据可执行文件路径、命令行和厂商信息进一步判断。';
  }

  function getScopeInfo(address) {
    if (address === '127.0.0.1' || address === '::1') {
      return { level: 'safe', label: '仅本机访问', description: '只接受这台电脑上的连接，通常不会暴露给局域网。' };
    }
    if (address === '0.0.0.0' || address === '::' || address === '[::]') {
      return { level: 'warn', label: '监听所有网卡', description: '可能被局域网中的其他设备访问，实际是否可达还取决于 Windows 防火墙。' };
    }
    return { level: 'info', label: '指定网卡', description: `只监听地址 ${address}，可达范围取决于该地址所属网络。` };
  }

  const api = { entries, categoryLabels, classifyService, explainService, getScopeInfo };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else global.serviceCatalog = api;
})(typeof window !== 'undefined' ? window : globalThis);
