'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { 
  MessageCircle, 
  CreditCard, 
  TrendingUp, 
  Shield, 
  Smartphone,
  BarChart3,
  Brain,
  Zap,
  CheckCircle,
  ArrowRight,
  Star,
  Users
} from 'lucide-react'



const banks = [
  { name: 'Itaú', logo: '🏦', color: 'bg-orange-500' },
  { name: 'Bradesco', logo: '🏛️', color: 'bg-red-500' },
  { name: 'Banco do Brasil', logo: '🏪', color: 'bg-yellow-500' },
  { name: 'Nubank', logo: '💜', color: 'bg-purple-500' },
  { name: 'Santander', logo: '🔴', color: 'bg-red-600' },
  { name: 'Caixa', logo: '🏗️', color: 'bg-blue-600' },
]

const testimonials = [
  {
    name: 'Ana Silva',
    role: 'Analista Financeira',
    content: 'O FinanBot revolucionou minha forma de gerenciar minhas finanças. A integração com o Open Finance me dá uma visão completa dos meus gastos.',
    rating: 5
  },
  {
    name: 'Pedro Santos',
    role: 'Empreendedor',
    content: 'Como dono de uma pequena empresa, o FinanBot tem sido fundamental para organizar minhas finanças pessoais e empresariais.',
    rating: 5
  },
  {
    name: 'Mariana Costa',
    role: 'Médica',
    content: 'Por trabalhar em horários irregulares, nunca tive tempo de organizar minhas finanças. Com o FinanBot, posso conversar com meu dinheiro a qualquer momento.',
    rating: 5
  }
]

export default function HomePage() {
  const [email, setEmail] = useState('')

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-foreground">FinanBot</span>
          </div>
          
          <nav className="hidden md:flex items-center space-x-8">
            <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">Funcionalidades</a>
            <a href="#banks" className="text-muted-foreground hover:text-foreground transition-colors">Bancos</a>
            <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">Preços</a>
            <a href="#testimonials" className="text-muted-foreground hover:text-foreground transition-colors">Depoimentos</a>
          </nav>
          
          <div className="flex items-center space-x-4">
            <Link 
              href="/login" 
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Entrar
            </Link>
            <Link 
              href="/register" 
              className="bg-primary text-primary-foreground px-4 py-2 rounded-lg btn-clean"
            >
              Login
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-24 pb-16 px-4">
        <div className="container mx-auto text-center max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-5xl md:text-7xl font-bold text-foreground mb-6 leading-tight">
              Assistente IA para
              <span className="block text-primary">
                Finanças Pessoais
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed">
              FinanBot te ajuda a entender, conversar e planejar seu dinheiro em tempo real, 
              sem precisar de planilhas. Comece a organizar suas finanças hoje mesmo.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <Link 
                href="/register"
                className="bg-primary text-primary-foreground px-8 py-4 rounded-xl font-semibold text-lg btn-clean flex items-center gap-2"
              >
                Começar com 7 dias grátis
                <ArrowRight className="w-5 h-5" />
              </Link>
              
              <Link 
                href="/demo"
                className="glass border-2 border-border text-muted-foreground px-8 py-4 rounded-xl font-semibold text-lg hover:border-primary hover:text-foreground transition-all"
              >
                Ver Demo
              </Link>
            </div>
          </motion.div>

          {/* WhatsApp Integration Preview */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="glass hover-subtle rounded-2xl p-8 max-w-md mx-auto"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                <Smartphone className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">FinanBot</h3>
                <p className="text-sm text-muted-foreground">● Online</p>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="bg-secondary rounded-lg p-3 mr-8">
                <p className="text-secondary-foreground">Como está minha saúde financeira?</p>
                <span className="text-xs text-muted-foreground">10:15</span>
              </div>
              
              <div className="bg-primary text-primary-foreground rounded-lg p-3 ml-8">
                <p>Com base nas suas transações dos últimos 30 dias (21 de junho de 2025 a 21 de julho de 2025), identifiquei as seguintes assinaturas de streaming ativas:</p>
                <span className="text-xs opacity-75">10:16</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-4">
              Todo o controle das suas finanças
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              O FinanBot é uma plataforma completa que oferece uma experiência única para gerenciar suas finanças
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: <MessageCircle className="w-8 h-8" />,
                title: "Chat com IA",
                description: "Converse sobre suas finanças em linguagem natural e obtenha insights personalizados"
              },
              {
                icon: <CreditCard className="w-8 h-8" />,
                title: "Open Finance",
                description: "Conecte suas contas bancárias de forma segura e automática"
              },
              {
                icon: <BarChart3 className="w-8 h-8" />,
                title: "Dashboard Inteligente",
                description: "Visualizações avançadas de gastos, receitas e tendências financeiras"
              },
              {
                icon: <Brain className="w-8 h-8" />,
                title: "Análise Automática",
                description: "IA analisa seus padrões de gasto e sugere melhorias"
              },
              {
                icon: <Shield className="w-8 h-8" />,
                title: "100% Seguro",
                description: "Conformidade total com regulamentações bancárias brasileiras"
              },
              {
                icon: <Zap className="w-8 h-8" />,
                title: "Tempo Real",
                description: "Dados atualizados automaticamente via Open Finance"
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="glass hover-subtle p-6 rounded-2xl"
              >
                <div className="text-primary mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Banks Section */}
      <section id="banks" className="py-16 bg-card">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-foreground mb-4">
              Conecte-se com suas instituições favoritas
            </h2>
            <p className="text-xl text-muted-foreground">
              Integração com os principais bancos brasileiros via Open Finance
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {banks.map((bank, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="glass hover-subtle rounded-xl p-6 text-center"
              >
                <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl">{bank.logo}</span>
                </div>
                <h3 className="font-semibold text-foreground">{bank.name}</h3>
              </motion.div>
            ))}
          </div>

          <div className="text-center mt-12">
            <p className="text-muted-foreground">E muitos outros bancos e fintechs brasileiros</p>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Veja o que nossos usuários dizem
            </h2>
            <p className="text-xl text-gray-600">
              Depoimentos de pessoas reais que usam FinanBot para gerenciar suas finanças
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-gradient-to-br from-gray-50 to-white p-6 rounded-2xl border border-gray-100"
              >
                <div className="flex items-center mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-700 mb-6 italic">"{testimonial.content}"</p>
                <div>
                  <h4 className="font-semibold text-gray-900">{testimonial.name}</h4>
                  <p className="text-gray-500 text-sm">{testimonial.role}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-finbot">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold text-white mb-4">
            Pronto para organizar suas finanças?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Junte-se a milhares de pessoas que já descobriram o poder de conversar com o dinheiro através do FinanBot
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link 
              href="/register"
              className="bg-white text-finbot-600 px-8 py-4 rounded-xl font-semibold text-lg hover:shadow-xl transition-all transform hover:scale-105"
            >
              Começar com 7 dias grátis
            </Link>
            
            <div className="flex items-center gap-2 text-blue-100">
              <CheckCircle className="w-5 h-5" />
              <span>Sem cartão de crédito necessário</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-gradient-finbot rounded-lg flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold">FinanBot</span>
              </div>
              <p className="text-gray-400">
                Seu assistente de IA para finanças pessoais. Converse com o seu dinheiro.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Recursos</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Plataforma</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Instituições</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Planos e Preços</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Depoimentos</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Suporte</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Central de Ajuda</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contato</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Status</a></li>
                <li><a href="#" className="hover:text-white transition-colors">API</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Legal</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Privacidade</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Termos</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Segurança</a></li>
                <li><a href="#" className="hover:text-white transition-colors">LGPD</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2025 FinanBot - Assistente de IA Financeiro. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  )
} 