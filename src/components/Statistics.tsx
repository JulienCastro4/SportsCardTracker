import React, { useState, useEffect } from 'react';
import { Card, ButtonGroup, Button } from 'react-bootstrap';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import useCardsService, { CardStats } from '../services/cards';
import '../styles/Statistics.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

ChartJS.defaults.devicePixelRatio = 2;
ChartJS.defaults.font.family = "'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', sans-serif";

type TimeFrame = 'week' | 'month' | 'year' | 'all';

const Statistics: React.FC = () => {
  const [timeframe, setTimeframe] = useState<TimeFrame>('week');
  const [stats, setStats] = useState<CardStats | null>(null);
  const [allTimeStats, setAllTimeStats] = useState<CardStats | null>(null);
  const [cardData, setCardData] = useState<any[]>([]);
  const cardsService = useCardsService();

  useEffect(() => {
    loadStats();
    loadAllTimeStats();
    loadCardData();
  }, [timeframe]);

  const loadCardData = async () => {
    try {
      const allCards = await cardsService.getAllCardsForStats();
      setCardData(allCards);
    } catch (error) {
      console.error('Error loading cards for chart:', error);
    }
  };

  const loadStats = async () => {
    try {
      console.log(`Loading stats for timeframe: ${timeframe}`);
      
      // Force a specific timeframe parameter to be sent to the server
      let timeframeParam: 'week' | 'month' | 'year' | undefined;
      
      if (timeframe === 'week') {
        timeframeParam = 'week';
      } else if (timeframe === 'month') {
        timeframeParam = 'month';
      } else if (timeframe === 'year') {
        timeframeParam = 'year';
      }
      
      // Get all cards for stats, regardless of collection
      const cards = await cardsService.getAllCardsForStats();
      
      // Calculate stats locally based on the timeframe
      const calculatedStats = calculateStats(cards, timeframeParam);
      
      setStats(calculatedStats);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  // Load all-time stats for the best performing sections
  const loadAllTimeStats = async () => {
    try {
      const cards = await cardsService.getAllCardsForStats();
      // Calculate all time stats without any timeframe filter
      const calculatedStats = calculateStats(cards, undefined);
      setAllTimeStats(calculatedStats);
    } catch (error) {
      console.error('Error loading all-time stats:', error);
    }
  };
  
  // Calculate stats locally based on cards and timeframe
  // Note: Cette fonction utilise les dates ISO d'origine du serveur pour le filtrage,
  // pas les dates formatées pour l'affichage. Cela garantit la cohérence avec la BD.
  const calculateStats = (cards: any[], timeframe?: 'week' | 'month' | 'year') => {
    // Cloner les cartes pour éviter de modifier l'original
    const allCards = [...cards];
    
    // Variables pour stocker les cartes filtrées
    let filteredCards = allCards;
    let cutoffDate: Date | null = null;
    
    // Définir la date limite en fonction du timeframe
    if (timeframe) {
      const now = new Date();
      cutoffDate = new Date();
      
      if (timeframe === 'week') {
        cutoffDate.setDate(now.getDate() - 7);
      } else if (timeframe === 'month') {
        cutoffDate.setMonth(now.getMonth() - 1);
      } else if (timeframe === 'year') {
        cutoffDate.setFullYear(now.getFullYear() - 1);
      }
      
      console.log(`Filtering for timeframe: ${timeframe}, cutoff date: ${cutoffDate.toISOString()}`);
    }
    
    // Séparer les cartes par statut et appliquer le filtrage par date si nécessaire
    let boughtCards = allCards.filter(card => card.status === 'bought');
    let soldCards = allCards.filter(card => card.status === 'sold');
    
    // Si un timeframe est spécifié, filtrer les cartes en fonction des dates
    if (cutoffDate) {
      // Pour les cartes achetées, on filtre par date d'achat
      boughtCards = boughtCards.filter(card => {
        if (!card.boughtDate) return false;
        const boughtDate = new Date(card.boughtDate);
        return boughtDate >= cutoffDate && boughtDate <= new Date();
      });
      
      // Pour les cartes vendues, on filtre par date de vente
      soldCards = soldCards.filter(card => {
        if (!card.soldDate) return false;
        const soldDate = new Date(card.soldDate);
        return soldDate >= cutoffDate && soldDate <= new Date();
      });
      
      console.log(`After timeframe filtering: ${boughtCards.length} bought cards, ${soldCards.length} sold cards`);
    }
    
    // Calculer les statistiques avec les cartes correctement filtrées
    const boughtInvestment = boughtCards.reduce((sum, card) => sum + card.price, 0);
    const soldInvestment = soldCards.reduce((sum, card) => sum + card.price, 0);
    const totalInvestment = boughtInvestment + soldInvestment;
    
    const totalSold = soldCards.reduce((sum, card) => {
      return sum + (card.soldPrice || 0);
    }, 0);
    
    const profit = totalSold - soldInvestment;
    
    // Analyser les profits par catégorie (uniquement pour les cartes vendues)
    const profitsByCategory: Record<string, { 
      totalProfit: number, 
      totalSold: number, 
      count: number,
      averageProfit: number 
    }> = {};
    
    for (const card of soldCards) {
      const category = card.category || 'Uncategorized';
      const profit = (card.soldPrice || 0) - card.price;
      
      if (!profitsByCategory[category]) {
        profitsByCategory[category] = { 
          totalProfit: 0, 
          totalSold: 0, 
          count: 0,
          averageProfit: 0 
        };
      }
      
      profitsByCategory[category].totalProfit += profit;
      profitsByCategory[category].totalSold += (card.soldPrice || 0);
      profitsByCategory[category].count += 1;
    }
    
    // Calculer la moyenne des profits par catégorie
    Object.keys(profitsByCategory).forEach(category => {
      const data = profitsByCategory[category];
      data.averageProfit = data.count > 0 ? data.totalProfit / data.count : 0;
    });
    
    // Analyser les investissements par catégorie
    // Pour cette analyse, nous utilisons à la fois les cartes achetées et vendues dans la période
    const allFilteredCards = [...boughtCards, ...soldCards];
    const investmentsByCategory: Record<string, {
      totalInvestment: number,
      count: number,
      averageInvestment: number
    }> = {};
    
    for (const card of allFilteredCards) {
      const category = card.category || 'Uncategorized';
      
      if (!investmentsByCategory[category]) {
        investmentsByCategory[category] = {
          totalInvestment: 0,
          count: 0,
          averageInvestment: 0
        };
      }
      
      investmentsByCategory[category].totalInvestment += card.price;
      investmentsByCategory[category].count += 1;
    }
    
    // Calculer la moyenne des investissements par catégorie
    Object.keys(investmentsByCategory).forEach(category => {
      const data = investmentsByCategory[category];
      data.averageInvestment = data.count > 0 ? data.totalInvestment / data.count : 0;
    });
    
    // Trier et limiter pour obtenir les catégories avec le plus d'investissements
    const topInvestmentCategories = Object.entries(investmentsByCategory)
      .sort(([, dataA], [, dataB]) => dataB.totalInvestment - dataA.totalInvestment)
      .slice(0, 3);
    
    // Analyser le ROI par catégorie (uniquement pour les cartes vendues)
    const roiByCategory: Record<string, {
      totalProfit: number,
      totalInvestment: number,
      count: number,
      roi: number
    }> = {};
    
    for (const card of soldCards) {
      const category = card.category || 'Uncategorized';
      const profit = (card.soldPrice || 0) - card.price;
      
      if (!roiByCategory[category]) {
        roiByCategory[category] = {
          totalProfit: 0,
          totalInvestment: 0,
          count: 0,
          roi: 0
        };
      }
      
      roiByCategory[category].totalProfit += profit;
      roiByCategory[category].totalInvestment += card.price;
      roiByCategory[category].count += 1;
    }
    
    // Calculer le ROI pour chaque catégorie
    Object.keys(roiByCategory).forEach(category => {
      const data = roiByCategory[category];
      data.roi = data.totalInvestment > 0 ? (data.totalProfit / data.totalInvestment) * 100 : 0;
    });
    
    // Trier et limiter pour obtenir les catégories avec le meilleur ROI
    const topRoiCategories = Object.entries(roiByCategory)
      .filter(([, data]) => data.count >= 2) // Au moins 2 cartes vendues pour une statistique plus pertinente
      .sort(([, dataA], [, dataB]) => dataB.roi - dataA.roi)
      .slice(0, 3);
    
    // Analyser les meilleures périodes de vente
    const salesByMonth: Record<string, {
      totalSales: number,
      count: number,
      totalProfit: number
    }> = {};
    
    for (const card of soldCards) {
      if (!card.soldDate) continue;
      
      const soldDate = new Date(card.soldDate);
      const monthYear = `${soldDate.getFullYear()}-${(soldDate.getMonth() + 1).toString().padStart(2, '0')}`;
      
      if (!salesByMonth[monthYear]) {
        salesByMonth[monthYear] = {
          totalSales: 0,
          count: 0,
          totalProfit: 0
        };
      }
      
      salesByMonth[monthYear].totalSales += (card.soldPrice || 0);
      salesByMonth[monthYear].count += 1;
      salesByMonth[monthYear].totalProfit += (card.soldPrice || 0) - card.price;
    }
    
    // Trier et limiter pour obtenir les meilleures périodes
    const topMonths = Object.entries(salesByMonth)
      .sort(([, dataA], [, dataB]) => dataB.totalSales - dataA.totalSales)
      .slice(0, 3);
    
    // Trier et limiter pour obtenir les meilleures catégories
    const topCategories = Object.entries(profitsByCategory)
      .sort(([, dataA], [, dataB]) => dataB.totalProfit - dataA.totalProfit)
      .slice(0, 3);
    
    return {
      totalInvestment,
      boughtInvestment,
      soldInvestment,
      totalSold,
      cardsBought: boughtCards.length,
      cardsSold: soldCards.length,
      profit,
      profitsByCategory,
      investmentsByCategory,
      roiByCategory,
      salesByMonth,
      topMonths,
      topCategories,
      topInvestmentCategories,
      topRoiCategories
    };
  };

  // Calculate profit based on sold cards only
  const profitLoss = stats?.profit ?? 0;
  const isProfitable = profitLoss >= 0;

  // Calculate ROI based on sold cards only
  const calculateROI = () => {
    if (!stats || !stats.soldInvestment || stats.soldInvestment === 0) {
      return 0;
    }
    return (profitLoss / stats.soldInvestment) * 100;
  };

  const roi = calculateROI();

  // Prepare chart data
  const chartData = {
    labels: ['Total Investment', 'Sold Investment', 'Sales', 'Profit/Loss'],
    datasets: [
      {
        label: 'Amount ($)',
        data: [
          (stats?.boughtInvestment || 0) + (stats?.soldInvestment || 0), // Investissement total = actuel + vendu
          stats?.soldInvestment || 0,
          stats?.totalSold || 0,
          profitLoss
        ],
        backgroundColor: [
          'rgba(54, 162, 235, 0.5)', // bleu pour l'investissement total
          'rgba(75, 192, 192, 0.5)',  // vert-bleu pour l'investissement vendu
          'rgba(105, 120, 209, 0.5)', // bleu-violet pour les ventes
          profitLoss >= 0 ? 'rgba(75, 192, 120, 0.5)' : 'rgba(255, 99, 132, 0.5)', // vert pour profit, rouge pour perte
        ],
        borderColor: [
          'rgba(54, 162, 235, 1)', 
          'rgba(75, 192, 192, 1)', 
          'rgba(105, 120, 209, 1)',
          profitLoss >= 0 ? 'rgba(75, 192, 120, 1)' : 'rgba(255, 99, 132, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    devicePixelRatio: 2,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        titleColor: '#495057',
        bodyColor: '#495057',
        borderColor: '#e9ecef',
        borderWidth: 1,
        padding: 10,
        boxWidth: 10,
        boxHeight: 10,
        usePointStyle: true
      },
      title: {
        display: true,
        text: 'Financial Overview',
        font: {
          size: 18,
          weight: 'bold' as const
        },
        color: '#495057'
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value: any) => `$${value}`,
          font: {
            size: 14
          },
          color: '#6c757d'
        },
        grid: {
          color: 'rgba(108, 117, 125, 0.1)'
        }
      },
      x: {
        ticks: {
          font: {
            size: 14
          },
          color: '#6c757d'
        },
        grid: {
          color: 'rgba(108, 117, 125, 0.1)'
        }
      }
    },
  };

  // Fonction pour préparer les données pour le graphique d'évolution
  const prepareCollectionValueChartData = () => {
    // Si pas de données, retourner un graphique vide
    if (!stats || !allTimeStats) {
      return {
        labels: [],
        datasets: [{
          label: 'Collection Value',
          data: [],
          borderColor: 'rgba(75, 192, 192, 1)',
          backgroundColor: 'rgba(75, 192, 192, 0.1)',
          tension: 0.4,
          fill: true,
        }]
      };
    }

    // Si aucune carte n'est encore chargée, montrer juste la valeur actuelle
    if (cardData.length === 0) {
      return {
        labels: [new Date().toLocaleDateString()],
        datasets: [{
          label: 'Collection Value ($)',
          data: [stats.boughtInvestment || 0],
          borderColor: 'rgba(75, 192, 192, 1)',
          backgroundColor: 'rgba(75, 192, 192, 0.1)',
          tension: 0.4,
          fill: true,
        }]
      };
    }

    // Créer un tableau avec toutes les cartes et leurs dates d'achat et de vente
    interface CardInfo {
      id: number;
      price: number;
      boughtDate: Date;
      soldDate: Date | null;
    }

    const cards: CardInfo[] = [];
    
    cardData.forEach(card => {
      try {
        if (card.boughtDate) {
          const boughtDate = new Date(card.boughtDate);
          if (!isNaN(boughtDate.getTime())) {
            // Ajouter la carte avec sa date d'achat et de vente (si applicable)
            let soldDate: Date | null = null;
            if (card.soldDate && !isNaN(new Date(card.soldDate).getTime())) {
              soldDate = new Date(card.soldDate);
            }
            
            cards.push({
              id: card.id,
              price: card.price || 0,
              boughtDate,
              soldDate
            });
          }
        }
      } catch (error) {
        console.error('Error processing card for valuation:', error);
      }
    });

    if (cards.length === 0) {
      return {
        labels: [new Date().toLocaleDateString()],
        datasets: [{
          label: 'Collection Value ($)',
          data: [stats.boughtInvestment || 0],
          borderColor: 'rgba(75, 192, 192, 1)',
          backgroundColor: 'rgba(75, 192, 192, 0.1)',
          tension: 0.4,
          fill: true,
        }]
      };
    }

    // Définir une date limite en fonction du timeframe
    const cutoffDate = new Date();
    if (timeframe === 'week') {
      cutoffDate.setDate(cutoffDate.getDate() - 7);
    } else if (timeframe === 'month') {
      cutoffDate.setDate(cutoffDate.getDate() - 30);
    } else if (timeframe === 'year') {
      cutoffDate.setDate(cutoffDate.getDate() - 365);
    } else {
      // Si 'all', trouver la date de la première carte
      let firstCardDate = new Date();
      cards.forEach(card => {
        if (card.boughtDate < firstCardDate) {
          firstCardDate = card.boughtDate;
        }
      });
      
      // Utiliser la date de la première carte comme limite
      cutoffDate.setTime(firstCardDate.getTime());
    }

    // Normaliser la date limite sans l'heure pour des comparaisons cohérentes
    const normalizedCutoff = new Date(cutoffDate.toISOString().split('T')[0] + 'T00:00:00');

    // Déterminer toutes les dates importantes entre la date limite et aujourd'hui
    const allDates = new Set<string>();
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    // Ajouter la date de cutoff comme point de départ
    allDates.add(normalizedCutoff.toISOString().split('T')[0]);
    
    // Ajouter les dates d'achat et de vente des cartes si elles sont dans l'intervalle
    cards.forEach(card => {
      // Format yyyy-mm-dd pour le tri
      const boughtDateStr = card.boughtDate.toISOString().split('T')[0];
      if (card.boughtDate >= normalizedCutoff) {
        allDates.add(boughtDateStr);
      }
      
      if (card.soldDate && card.soldDate >= normalizedCutoff) {
        const soldDateStr = card.soldDate.toISOString().split('T')[0];
        allDates.add(soldDateStr);
      }
    });
    
    // Ajouter aujourd'hui si ce n'est pas déjà là
    allDates.add(todayStr);
    
    // Convertir les dates en array et trier
    let sortedDates = Array.from(allDates).sort();
    
    // Réduire le nombre de points affichés selon le timeframe pour éviter l'encombrement
    if (sortedDates.length > 30 && timeframe === 'all') {
      // Pour "all time", regrouper par mois
      const monthlyDates = new Map<string, string>();
      sortedDates.forEach(dateStr => {
        const date = new Date(dateStr);
        const monthYear = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        monthlyDates.set(monthYear, dateStr);
      });
      
      // Toujours garder la première et la dernière date
      const firstDate = sortedDates[0];
      const lastDate = sortedDates[sortedDates.length - 1];
      
      // Utiliser les points mensuels
      sortedDates = Array.from(monthlyDates.values());
      
      // S'assurer que la première et la dernière date sont incluses
      if (!sortedDates.includes(firstDate)) sortedDates.unshift(firstDate);
      if (!sortedDates.includes(lastDate)) sortedDates.push(lastDate);
      
      // Trier à nouveau
      sortedDates.sort();
    } else if (sortedDates.length > 15 && timeframe === 'year') {
      // Pour "year", regrouper par semaine ou par deux semaines
      const weeklyDates = new Map<number, string>();
      sortedDates.forEach(dateStr => {
        const date = new Date(dateStr);
        // Obtenir le numéro de la semaine dans l'année
        const weekNumber = Math.floor((date.getTime() - normalizedCutoff.getTime()) / (7 * 24 * 60 * 60 * 1000));
        // Utiliser seulement chaque 2e semaine
        if (weekNumber % 2 === 0) {
          weeklyDates.set(weekNumber, dateStr);
        }
      });
      
      // Toujours garder la première et la dernière date
      const firstDate = sortedDates[0];
      const lastDate = sortedDates[sortedDates.length - 1];
      
      // Utiliser les points bimensuels
      sortedDates = Array.from(weeklyDates.values());
      
      // S'assurer que la première et la dernière date sont incluses
      if (!sortedDates.includes(firstDate)) sortedDates.unshift(firstDate);
      if (!sortedDates.includes(lastDate)) sortedDates.push(lastDate);
      
      // Trier à nouveau
      sortedDates.sort();
    }

    // Préparer les données du graphique
    const chartDates: string[] = [];
    const chartValues: number[] = [];

    // Pour chaque date, calculer la valeur totale de la collection
    sortedDates.forEach(dateStr => {
      const currentDate = new Date(dateStr + 'T00:00:00'); // Ajouter l'heure pour éviter les problèmes de fuseau horaire
      let collectionValue = 0;

      // Parcourir toutes les cartes
      cards.forEach(card => {
        // Normaliser les dates pour la comparaison (sans l'heure)
        const normalizedBoughtDate = new Date(card.boughtDate.toISOString().split('T')[0] + 'T00:00:00');
        const normalizedCurrentDate = new Date(currentDate.toISOString().split('T')[0] + 'T00:00:00');
        
        // Si la carte a été achetée avant ou à cette date
        if (normalizedBoughtDate <= normalizedCurrentDate) {
          // Et si elle n'a pas été vendue, ou a été vendue après cette date
          if (!card.soldDate) {
            // Alors elle fait partie de la collection à cette date
            collectionValue += card.price;
          } else {
            const normalizedSoldDate = new Date(card.soldDate.toISOString().split('T')[0] + 'T00:00:00');
            if (normalizedSoldDate > normalizedCurrentDate) {
              collectionValue += card.price;
            }
          }
        }
      });

      // Convertir la date pour l'affichage en utilisant les fonctions de localisation
      const displayDate = new Date(dateStr + 'T12:00:00').toLocaleDateString(); // Utiliser midi pour éviter les problèmes de fuseau horaire
      chartDates.push(displayDate);
      chartValues.push(collectionValue);
    });

    return {
      labels: chartDates,
      datasets: [{
        label: 'Collection Value ($)',
        data: chartValues,
        borderColor: 'rgba(75, 192, 192, 1)',
        backgroundColor: 'rgba(75, 192, 192, 0.3)',
        borderWidth: 2,
        pointBackgroundColor: 'rgba(75, 192, 192, 1)',
        tension: 0.4,
        fill: true,
      }]
    };
  };
  
  const collectionValueChartData = prepareCollectionValueChartData();
  
  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    devicePixelRatio: 2,
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        titleColor: '#495057',
        bodyColor: '#495057',
        borderColor: '#e9ecef',
        borderWidth: 1,
        padding: 10,
        usePointStyle: true,
        callbacks: {
          label: function(context: any) {
            return `Value: $${context.raw.toFixed(2)}`;
          }
        }
      },
      title: {
        display: true,
        text: 'Collection Value Over Time',
        font: {
          size: 18,
          weight: 'bold' as const
        },
        color: '#495057'
      },
      filler: {
        propagate: true
      },
    },
    elements: {
      line: {
        tension: 0.4,
        fill: true
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value: any) => `$${value}`,
          font: {
            size: 14
          },
          color: '#6c757d'
        },
        grid: {
          color: 'rgba(108, 117, 125, 0.1)'
        }
      },
      x: {
        ticks: {
          font: {
            size: 12
          },
          color: '#6c757d',
          maxRotation: 45,
          minRotation: 45
        },
        grid: {
          color: 'rgba(108, 117, 125, 0.1)'
        }
      }
    },
  };

  const getTimeframeLabel = () => {
    switch(timeframe) {
      case 'week': return 'Past Week';
      case 'month': return 'Past Month';
      case 'year': return 'Past Year';
      default: return 'All Time';
    }
  };

  return (
    <>
      {/* 1. Cards d'information */}
      <Card className="mb-4 shadow-sm">
        <Card.Header className="d-flex justify-content-between align-items-center bg-secondary text-white">
          <h5 className="mb-0">Statistics - {getTimeframeLabel()}</h5>
          <ButtonGroup size="sm">
            <Button
              variant={timeframe === 'week' ? 'light' : 'outline-light'}
              onClick={() => setTimeframe('week')}
            >
              Week
            </Button>
            <Button
              variant={timeframe === 'month' ? 'light' : 'outline-light'}
              onClick={() => setTimeframe('month')}
            >
              Month
            </Button>
            <Button
              variant={timeframe === 'year' ? 'light' : 'outline-light'}
              onClick={() => setTimeframe('year')}
            >
              Year
            </Button>
            <Button
              variant={timeframe === 'all' ? 'light' : 'outline-light'}
              onClick={() => setTimeframe('all')}
            >
              All Time
            </Button>
          </ButtonGroup>
        </Card.Header>
        <Card.Body className="bg-light">
          <div className="row mb-4">
            <div className="col-md-3">
              <Card className="text-center h-100 shadow-sm border-0">
                <Card.Body>
                  <h6 className="fw-bold text-secondary">Total Investment</h6>
                  <h3 className="text-dark">${stats?.totalInvestment?.toFixed(2) || '0.00'}</h3>
                  <small className="text-muted">
                    Current: ${stats?.boughtInvestment?.toFixed(2) || '0.00'}<br />
                    Sold: ${stats?.soldInvestment?.toFixed(2) || '0.00'}
                  </small>
                </Card.Body>
              </Card>
            </div>
            <div className="col-md-3">
              <Card className="text-center h-100 shadow-sm border-0">
                <Card.Body>
                  <h6 className="fw-bold text-secondary">Total Sales</h6>
                  <h3 className="text-dark">${stats?.totalSold?.toFixed(2) || '0.00'}</h3>
                  <small className="text-muted">{stats?.cardsSold || 0} cards sold</small>
                </Card.Body>
              </Card>
            </div>
            <div className="col-md-3">
              <Card className="text-center h-100 shadow-sm border-0">
                <Card.Body className={profitLoss > 0 ? 'bg-success-subtle' : (profitLoss < 0 ? 'bg-danger-subtle' : 'bg-secondary-subtle')}>
                  <h6 className="fw-bold text-secondary">Profit/Loss</h6>
                  <h3 className={profitLoss > 0 ? 'text-success' : (profitLoss < 0 ? 'text-danger' : 'text-secondary')}>
                    ${profitLoss.toFixed(2)}
                  </h3>
                  <small className="text-muted">
                    From sold cards only
                  </small>
                </Card.Body>
              </Card>
            </div>
            <div className="col-md-3">
              <Card className="text-center h-100 shadow-sm border-0">
                <Card.Body className={roi > 0 ? 'bg-success-subtle' : (roi < 0 ? 'bg-danger-subtle' : 'bg-secondary-subtle')}>
                  <h6 className="fw-bold text-secondary">ROI</h6>
                  <h3 className={roi > 0 ? 'text-success' : (roi < 0 ? 'text-danger' : 'text-secondary')}>
                    {roi ? `${roi.toFixed(1)}%` : '0.0%'}
                  </h3>
                  <small className="text-muted">Return on sold cards</small>
                </Card.Body>
              </Card>
            </div>
          </div>
        </Card.Body>
      </Card>
      
      {/* 2. Graphique d'évolution de la collection */}
      <Card className="mb-4 shadow-sm">
        <Card.Header className="bg-secondary text-white">
          <h5 className="mb-0">Collection Value Over Time - {getTimeframeLabel()}</h5>
        </Card.Header>
        <Card.Body className="bg-light">
          <div className="row">
            <div className="col-12 d-flex justify-content-center">
              <div style={{ height: '450px', width: '85%' }}>
                <Line 
                  data={collectionValueChartData} 
                  options={lineChartOptions} 
                  style={{ height: '100%', width: '100%' }} 
                />
              </div>
            </div>
          </div>
        </Card.Body>
      </Card>

      {/* 3. Graphique financier */}
      <Card className="mb-4 shadow-sm">
        <Card.Header className="bg-secondary text-white">
          <h5 className="mb-0">Financial Overview - {getTimeframeLabel()}</h5>
        </Card.Header>
        <Card.Body className="bg-light">
          <div className="row">
            <div className="col-12 d-flex justify-content-center">
              <div style={{ height: '450px', width: '85%' }}>
                <Bar 
                  data={chartData} 
                  options={chartOptions} 
                  style={{ height: '100%', width: '100%' }} 
                />
              </div>
            </div>
          </div>
        </Card.Body>
      </Card>

      {/* 4. Advanced Analysis */}
      <Card className="mb-4 shadow-sm">
        <Card.Header className="bg-secondary text-white">
          <h5 className="mb-0 fw-bold">Advanced Analysis</h5>
          <small className="text-white-50">Based on all-time data, regardless of selected timeframe</small>
        </Card.Header>
        <Card.Body className="bg-light">
          <div className="row">
            {/* Best sales periods */}
            <div className="col-md-6 mb-4">
              <Card className="shadow-sm border-0 analysis-card">
                <Card.Header className="bg-warning text-dark">
                  <h5 className="mb-0 fw-bold">Best Sales Periods</h5>
                </Card.Header>
                <Card.Body>
                  {allTimeStats?.topMonths && allTimeStats.topMonths.length > 0 ? (
                    <div className="table-responsive">
                      <table className="table table-sm table-hover">
                        <thead className="table-light">
                          <tr>
                            <th>Period</th>
                            <th>Sales</th>
                            <th>Cards</th>
                            <th>Profit</th>
                          </tr>
                        </thead>
                        <tbody>
                          {allTimeStats.topMonths.map(([month, data], idx: number) => {
                            const [year, monthNum] = month.split('-');
                            const monthName = new Date(parseInt(year), parseInt(monthNum) - 1).toLocaleString('default', { month: 'long' });
                            return (
                              <tr key={idx}>
                                <td><strong>{monthName} {year}</strong></td>
                                <td>${data.totalSales.toFixed(2)}</td>
                                <td>{data.count}</td>
                                <td className={data.totalProfit > 0 ? 'text-success fw-bold' : (data.totalProfit < 0 ? 'text-danger fw-bold' : 'text-secondary fw-bold')}>
                                  ${data.totalProfit.toFixed(2)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-center text-muted">No sales recorded</p>
                  )}
                </Card.Body>
              </Card>
            </div>
            
            {/* Combined Categories Performance */}
            <div className="col-md-6 mb-4">
              <Card className="shadow-sm border-0 analysis-card">
                <Card.Header className="bg-warning text-dark">
                  <h5 className="mb-0 fw-bold">Best Performing Categories</h5>
                </Card.Header>
                <Card.Body>
                  {allTimeStats?.topCategories && allTimeStats.topCategories.length > 0 ? (
                    <div className="table-responsive">
                      <table className="table table-sm table-hover">
                        <thead className="table-light">
                          <tr>
                            <th>Category</th>
                            <th>Profit</th>
                            <th>ROI</th>
                            <th>Cards</th>
                          </tr>
                        </thead>
                        <tbody>
                          {allTimeStats.topCategories.map(([category, data], idx: number) => {
                            // Find the ROI data for this category if it exists
                            const roiData = allTimeStats.topRoiCategories?.find(([cat]) => cat === category)?.[1];
                            
                            // Calculated ROI for consistency with display in other places
                            const calculatedRoi = data.totalProfit && data.totalSold ? 
                              (data.totalProfit / (data.totalSold - data.totalProfit)) * 100 : 0;
                            
                            return (
                              <tr key={idx}>
                                <td><strong>{category}</strong></td>
                                <td className={data.totalProfit > 0 ? 'text-success fw-bold' : (data.totalProfit < 0 ? 'text-danger fw-bold' : 'text-secondary fw-bold')}>
                                  ${data.totalProfit.toFixed(2)}
                                </td>
                                <td className={calculatedRoi > 0 ? 'text-success' : (calculatedRoi < 0 ? 'text-danger' : 'text-secondary')}>
                                  {calculatedRoi.toFixed(1)}%
                                </td>
                                <td>{data.count}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-center text-muted">No sales recorded</p>
                  )}
                </Card.Body>
              </Card>
            </div>
            
            {/* Top investment categories */}
            <div className="col-md-6 mb-4">
              <Card className="shadow-sm border-0 analysis-card">
                <Card.Header className="bg-warning text-dark">
                  <h5 className="mb-0 fw-bold">Top Investment Categories</h5>
                </Card.Header>
                <Card.Body>
                  {allTimeStats?.topInvestmentCategories && allTimeStats.topInvestmentCategories.length > 0 ? (
                    <div className="table-responsive">
                      <table className="table table-sm table-hover">
                        <thead className="table-light">
                          <tr>
                            <th>Category</th>
                            <th>Investment</th>
                            <th>Cards</th>
                            <th>Avg. Investment</th>
                          </tr>
                        </thead>
                        <tbody>
                          {allTimeStats.topInvestmentCategories.map(([category, data], idx: number) => (
                            <tr key={idx}>
                              <td><strong>{category}</strong></td>
                              <td className="fw-bold">
                                ${data.totalInvestment.toFixed(2)}
                              </td>
                              <td>{data.count}</td>
                              <td>
                                ${data.averageInvestment.toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-center text-muted">No investments recorded</p>
                  )}
                </Card.Body>
              </Card>
            </div>
            
            {/* All Categories Performance */}
            <div className="col-md-6 mb-4">
              <Card className="shadow-sm border-0 analysis-card">
                <Card.Header className="bg-warning text-dark">
                  <h5 className="mb-0 fw-bold">All Categories Performance</h5>
                </Card.Header>
                <Card.Body>
                  {allTimeStats?.profitsByCategory && Object.keys(allTimeStats.profitsByCategory).length > 0 && allTimeStats.roiByCategory ? (
                    <div className="table-responsive" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                      <table className="table table-sm table-hover">
                        <thead className="table-light sticky-top">
                          <tr>
                            <th>Category</th>
                            <th>Profit</th>
                            <th>ROI</th>
                            <th>Cards</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(allTimeStats.profitsByCategory)
                            .sort(([, dataA], [, dataB]) => dataB.totalProfit - dataA.totalProfit)
                            .map(([category, data], idx) => {
                              const roiData = allTimeStats.roiByCategory?.[category];
                              
                              return (
                                <tr key={idx}>
                                  <td><strong>{category}</strong></td>
                                  <td className={data.totalProfit > 0 ? 'text-success' : (data.totalProfit < 0 ? 'text-danger' : 'text-secondary')}>
                                    ${data.totalProfit.toFixed(2)}
                                  </td>
                                  <td className={roiData && roiData.roi > 0 ? 'text-success' : (roiData && roiData.roi < 0 ? 'text-danger' : 'text-secondary')}>
                                    {roiData ? `${roiData.roi.toFixed(1)}%` : '0.0%'}
                                  </td>
                                  <td>{data.count}</td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-center text-muted">No category performance data available</p>
                  )}
                </Card.Body>
              </Card>
            </div>
          </div>
        </Card.Body>
      </Card>
    </>
  );
};

export default Statistics; 