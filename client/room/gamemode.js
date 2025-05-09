import { Map, AreaService, AreaViewService, AreaPlayerTriggerService, Game, Players, Inventory, LeaderBoard, BuildBlocksSet, Teams, Damage, BreackGraph, Ui, Properties, GameMode, Spawns, Timers, TeamsBalancer, NewGame, NewGameVote } from 'pixel_combats/room';
import { DisplayValueHeader, Color } from 'pixel_combats/basic';

try {
	
// * Настройки, констант. * //
const WaitingPlayersTime = 10;
const BuildBaseTime = 60;
const GameModeTime = 300;
const DefPoints = GameModeTime * 0.2;
const EndOfMatchTime = 10;
const DefPointsMaxCount = 30;
const DefTimerTickInderval = 1;
const SavePointsCount = 10;
const RepairPointsBySecond = 1;
const CapturePoints = 10; // * Столько нужно очков, для захвата. * //
const MaxCapturePoints = 15; // * Макс очков. * //
const RedCaptureW = 1; // * Вес красных, при захвате - зон. * //
const BlueCaptureW = 2; // * Вес синих, при защите - зон. * //
const CaptureRestoreW = 1; // * Столько очков отнимет, если красных нет в зоне. * //
const UnCapturedColor = new Color(0, 0, 1, 0);
const FakeCapturedColor = new Color(1, 1, 1, 0); // * Определённая зона, при стремление захвате зоны. * //
const CapturedColor = new Color(1, 0, 0, 0);
const MaxSpawnsByArea = 25; // * Макс спавнов, на зону. * //

// * Константы, имён - с продрублиновыми подсказками. * //
const WaitingStateValue = 'Waiting';
const BuildModeStateValue = 'BuildMode';
const GameStateValue = 'Game';
const EndOfMatchStateValue = 'EndOfMatch';
const DefAreaTag = 'Def';
const CaptureAreaTag = 'Capture';
const DefBlueTriggerHint = 'Защищайтесь, синию - зону!';
const DefBluePointsHint = 'Защищайте, эту - зону!';
const RedDefCaptureZoneHint = 'Захватите, синию - зону!';
const BlueBuildTriggerDefHint = 'Застройте синию - зону!';
const TeamSelectionHint = 'Выберите, команду!';
const RedWaitingBlueBuildTriggerHint = 'Синие, застраивают синию зону.Помешай им, застроить - синию зону!';
const CaptureBlueTriggerHint = 'Красные, захватывают синию зону.Не дай захватить, синию - зону!';
const CaptureTriggerBlueHint = 'Идёт захват, синей зоны...';

// * Постоянные объекты констант, при роботе с режимом. * //
const MainTimer = Timers.GetContext().Get('Main');
const DefTickTimer = Timers.GetContext().Get('DefTimer');
const CapturedAreaIndexProp = Properties.GetContext().Get('RedCaptiredIndex');
const StateProp = Properties.GetContext().Get('State');
const DefAreas = AreaService.GetByTag(DefAreaTag);
const CaptureAreas = AreaService.GetByTag(CaptureAreaTag);
let CaptureTriggers = [];
let CaptureViews = [];
let CaptureProperties = [];

// * Определяем цвет, всем зонам - для захвата. * //
Map.OnLoad.Add(function() {
 InitializeDefAreas();
});

function InitializeDefAreas() {
 DefAreas = AreaService.GetByTag(DefAreaTag);
 CaptureAreas = AreaService.GetByTag(CaptureAreaTag);
// * Ограничитель, постоянных - зон. * //
   if (CaptureAreas == null) return;
    if (CaptureAreas.length == 0) return;
 captureTriggers = [];
 captureViews = [];
 captureProperties = [];
    // * Сортировка, имени зон. * //
 CaptureAreas.sort(function (a, b) {
	if (a.Name > b.Name) return 1;
	if (a.Name < b.Name) return -1;
   return 0;
  });
// * Инициализация, объектных перемен - с ограниченными зонами. * //
 for (const i = 0; i < CaptureAreas.length; ++i) {
   // * Создаём, визулиязатор зоны. * //
 const CaptureView = AreaViewService.GetContext().Get(CaptureAreas[i].Name + 'CaptureView');
 CaptureViews.push(CaptureView);
// Создаём, постоянный - триггер зоны.  * //
const CaptureTrigger = AreaPlayerTriggerService.Get(CaptureAreas[i].Name + 'CaptureTrigger');
CaptureTriggers.push(CaptureTrigger);
       // Основное свойство, для - захвата.
	const prop = Properties.GetContext().Get(CaptureAreas[i].Name + 'Property');
	  prop.OnValue.Add(CapturePropOnValue);
		 captureProperties.push(prop);
	}
}
InitializeDefAreas();
//function LogTrigger(player, trigger) {
//	log.debug("вошли в " + trigger);
//}
function CapturePropOnValue(prop) {
 // * Образовываем индекс, зоны. * //
const index = -1;
     for (const i = 0; i < CaptureProperties.length; ++i)
		 if (CaptureProperties[i] == prop) {
			 index = i;
		  break;
		}
// * Отметка зон, захваченой/незахваченой области. * //
 if (prop.Value >= CapturePoints) CaptureArea(index);
  else {
// * Закраска, в фейк зону. * //
	const d = prop.Value / MaxCapturePoints;
  if (index >= 0) {
		CaptureViews[index].Color = {
			r: (FakeCapturedColor.r - UnCapturedColor.r) * d + UnCapturedColor.r,
			g: (FakeCapturedColor.g - UnCapturedColor.g) * d + UnCapturedColor.g,
			b: (FakeCapturedColor.b - UnCapturedColor.b) * d + UnCapturedColor.b
		  };
	}
// * Снятие захвата, с зон. * //
	   UncaptureArea(index);
   }
	   // * Задаём, индекс захвата - областной зоны. * //
	SetSpawnIndex();
  }
// * Отметка зоны, не захваченной. * //
function CaptureArea(index) {
  if (index < 0 || index >= CaptureAreas.length) return;
	  CaptureViews[index].Color = CapturedColor;
	if (index < CaptureProperties.length - 1)
		CaptureViews[index + 1].Enable = true;
}
// * Отмечаем, зону - не захваченной. * //
function UnCaptureArea(index) {
 if (index < 0 || index >= CaptureAreas.length) return;
   CaptureViews[index].Color = UnCapturedColor;
	if (index < CaptureProperties.length - 1 && CaptureProperties[index + 1].Value < CapturePoints)
		CaptureViews[index + 1].Enable = false;
	if (index > 0 && CaptureProperties[index - 1].Value < CapturePoints)
		CaptureViews[index].Enable = false;
}
// * Задаём, область спавна. * //
function SetSpawnIndex() {
 // * Макс, захвата зон. * //
  const MaxIndex = -1;
for (const i = 0; i < CaptureProperties.length; ++i) {
    if (CaptureProperties[i].Value >= CapturePoints) MaxIndex = i;
     }
	CapturedAreaIndexProp.Value = MaxIndex;
}
// * Объекты, сознания - областей спавна. * //
CapturedAreaIndexProp.OnValue.Add(function(prop) {
 const index = prop.Value;
const SpawnsRed = Spawns.GetContext(RedTeam);
  // * Отчиска, спавнов. * //
 SpawnsRed.CustomSpawnPoints.Clear();
      // * Сброс, спавнов областей. * //
           if (index < 0 || index >= CaptureAreas.length) return;
   // * Задаём, спавны. * //
 const area = captureAreas[index];
 const iter = area.Ranges.GetEnumerator();
      iter.MoveNext();
	    const range = iter.Current;
    // * Определяем, просмотр - спавнов. * //
	const lookPoint = {};
	    if (index < CaptureAreas.length - 1) lookPoint = CaptureAreas[index + 1].Ranges.GetAveragePosition();
	else {
		  if (defAreas.length > 0)
			   lookPoint = DefAreas[0].Ranges.GetAveragePosition();
	}
	//log.debug("range=" + range);
	const spawnsCount = 0;
	for (const x = range.Start.x; x < range.End.x; x += 2)
		    for (const z = range.Start.z; z < range.End.z; z += 2) {
		SpawnsRed.CustomSpawnPoints.Add(x, range.Start.y, z, Spawns.GetSpawnRotation(x, z, lookPoint.x, lookPoint.z));
			  ++spawnsCount;
			if (spawnsCount > MaxSpawnsByArea) return;
		}
});

// Проверка, валидности - режима.
//if (defAreas.length == 0) Validate.ReportInvalid("GameMode/Validation/NeedDefTaggedArea");
//else Validate.ReportValid();

// * Применяем параметры, создания - комнаты. * //
Damage.FriendlyFire = GameMode.Parameters.GetBool('FriendlyFire');
Map.Rotation = GameMode.Parameters.GetBool('MapRotation');
BreackGraph.OnlyPlayerBlocksDmg = GameMode.Parameters.GetBool('PartialDesruction');
BreackGraph.WeakBlocks = GameMode.Parameters.GetBool('LoosenBlocks');

// * Визуализатор, зон - защиты. * //
const DefView = AreaViewService.GetContext().Get('DefView');
  DefView.Color = UnCapturedColor;
  DefView.Tags = [DefAreaTag];
  DefView.Enable = true;

// Создаём, триггер - зоны захвата. * //
const DefTrigger = AreaPlayerTriggerService.Get('DefTrigger');
DefTrigger.Tags = [DefAreaTag];
DefTrigger.Enable = true;
DefTrigger.OnEnter.Add(function(Player) {
  if (Player.Team === BlueTeam) {
	Player.Ui.Hint.Value = DefBluePointsHint;
		return;
}
   if (Player.Team == redTeam) {
	 if (StateProp.Value === GameStateValue) {
	Player.Ui.Hint.Value = CaptureTriggerBlueHint;
		else
	     Player.Ui.Hint.Reset();
		   return;
              }  
	}
});
DefTrigger.OnExit.Add(function(Player) {
 Player.Ui.Hint.Reset();
});

// * Задаём обработчик таймера, триггера. * //
defTickTimer.OnTimer.Add(function (timer) {
 DefTriggerUpdate();
 CaptureTriggersUpdate();
});
function DefTriggerUpdate() {
 // * Ограничитель, игрового режима. * //
 if (StateProp.Value != GameStateValue) return;
     // * Поиск количества синих, и красных в триггере. * //
const BlueCount = 0;
const RedCount = 0;
const CapturePlayers = DefTrigger.GetPlayers();
   for (const i = 0; i < CapturePlayers.length; ++i) {
	 const Play = CapturePlayers[i];
	if (Play.Team === BlueTeam) ++BlueCount;
	 if (Play.Team === RedTeam) ++RedCount;
   }
// * Если красных нет в зоне, то восстанавливаются очки. * //
 if (RedCount === 0) {
	// * Восстанавливаем очки, до несгораемой - суммы. * //
	if (BlueTeam.Properties.Get('Deaths').Value % SavePointsCount != 0) {
	 BlueTeam.Properties.Get('Deaths').Value += RepairPointsBySecond;
		 // * Синим, выдаётся - подсказка об обороне зоны. * //
		if (StateProp.Value === GameStateValue) {
			BlueTeam.Ui.Hint.Value = DefBluePointsHint;
		return;
		    }
		}
	}
	//* Если есть хоть один красный, то очки отнимаются. * //
	 BlueTeam.Properties.Get('Deaths').Value -= RedCount;
	 // * Синим выдаёт, подсказка что зону захватывают
	if (StateProp.Value === GameStateValue) {
		BlueTeam.Ui.Hint.Value = CaptureBlueTriggerHint;
	    }
}
// * Обновление, всех зон - захвата. * //
function CaptureTriggersUpdate() {
   // * Ограничитель, игрового режима. * //
 if (StateProp.Value != GameStateValue) return;
 // * Ограничитель. * //
 if (CaptureTriggers == null) return;
 if (CaptureTriggers.length == 0) return;
	  // * Обновление, зон. * //
	for (const i = 0; i < CaptureTriggers.length; ++i) {
	// * Берём, триггер зоны. * //
	  const Trigger = CaptureTriggers[i];
		 // * Роиск количества синих, и красных в триггере. * //
		const BlueCount = 0;
		const RedCount = 0;
		 CapturePlayers = Trigger.GetPlayers();
		  for (const j = 0; j < CapturePlayers.length; ++j) {
		 const Play = CapturePlayers[j];
			if (Play.Team === BlueTeam) ++BlueCount;
			if (Play.Team === RedTeam) ++RedCount;
		}
		 // Свойство, захвата зоны. * //
		const index = -1;
		  for (const i = 0; i < CaptureTriggers.length; ++i) {
			if (CaptureTriggers[i] == Trigger) {
				  index = i;
				break
			}
		  }
		if (index < 0) continue;	
  const Value = CaptureProperties[index].Value;
		    // * Определяем, на сколько очков - изменять зону. * //
		// * Очки, за присутствие - синих. * //
		 const ChangePoints = - BlueCount * BlueCaptureW;
		 // Очки, за присутствие - красных. * //
		if (index == 0 || CaptureProperties[index - 1].Value >= CapturePoints) {
		   ChangePoints += RedCount * RedCaptureW;
		// * Спад очков захвата, если нет красных. * //
		if (RedCount == 0 && Value < CapturePoints) ChangePoints -= CaptureRestoreW;
		 // * Ограничители. * //
		 if (ChangePoints === 0) continue;
		  const NewValue = Value + ChangePoints;
		   if (NewValue > MaxCapturePoints) NewValue = MaxCapturePoints;
	  	  if (NewValue < 0) NewValue = 0;
		// * Изменяем очки, захвата зоны. * //
		CaptureProperties[index].Value = NewValue;
		}
	}
}

// * Параметры игры (устарело) * //
BreackGraph.PlayerBlockBoost = true;
Properties.GetContext().GameModeName.Value = "GameModes/Team Dead Match";
TeamsBalancer.IsAutoBalance = true;
Ui.GetContext().MainTimerId.Value = mainTimer.Id;
// * Создаём, команды. * //
const BlueTeam = CreateNewTeam('Blue', 'Teams/Blue \n Синие', new Color(0, 0, 1, 0), BuildBlocksSet.Blue);
const RedTeam = CreateNewTeam('Red', 'Teams/Red \n Красные', new Color(1, 0, 0, 0), BuildBlocksSet.Red);
BlueTeam.Spawns.SpawnPointsGroups.Add(1);
RedTeam.Spawns.SpawnPointsGroups.Add(2);

// * Создаём, моментальный спавн - красным. * //
BlueTeam.Spawns.RespawnTime.Value = 10;
RedTeam.Spawns.RespawnTime.Value = 0;
// * Задаем макс очков, синей команды. * //
BlueTeam.Properties.Get('Deaths').Value = DefPoints;


// * Задаём, что выводить - в лидербордах. * //
LeaderBoard.PlayerLeaderBoardValues = [
	{
		Value: 'Kills',
		DisplayName: 'Statistics/Kills',
		ShortDisplayName: 'Statistics/KillsShort'
	},
	{
		Value: 'Deaths',
		DisplayName: 'Statistics/Deaths',
		ShortDisplayName: 'Statistics/DeathsShort'
	},
	{
		Value: 'Spawns',
		DisplayName: 'Statistics/Spawns',
		ShortDisplayName: 'Statistics/SpawnsShort'
	},
	{
		Value: 'Scores',
		DisplayName: 'Очки',
		ShortDisplayName: 'Очки'
	}
];
LeaderBoard.TeamLeaderBoardValue = {
	Value: 'Deaths',
	DisplayName: 'Statistics\Deaths',
	ShortDisplayName: 'Statistics\Deaths'
};
// * Вес игрока, в лидерборде. * //
LeaderBoard.PlayersWeightGetter.Set(function(Player) {
	return Player.Properties.Get('Kills').Value;
});

// * Выводим, с верху - счет команды синие. * //
Ui.GetContext().TeamProp1.Value = { Team: 'Blue', Prop: 'Deaths' };

// * Разрешаем вход, в команды - по запросу. * //
Teams.OnRequestJoinTeam.Add(function(Player, Team) { Team.Add(Player); });
// * Спавн, по входу - в команду. * //
Teams.OnPlayerChangeTeam.Add(function(Player) { Player.Spawns.Spawn() });

// * делаем игроков неуязвимыми, после респавна. * //
Spawns.GetContext().OnSpawn.Add(function (player) {
 player.Properties.Immortality.Value = true;
 player.Timers.Get('Immortality').Restart(5);
});
Timers.OnPlayerTimer.Add(function (timer) {
 if (timer.Id != Immortality) timer.Player.Properties.Immortality.Value = false;
});

// * Если в команде количество смертей, занулилось то завершаем - игру. * //
Properties.OnTeamProperty.Add(function(Context, Value) {
 if (Context.Team != BlueTeam) return;
  if (Value.Name !== 'Deaths') return;
	 if (Value.Value <= 0) { 
	RedWin();
	  }
});

// * Обработчик спавнов. * //
Spawns.OnSpawn.Add(function(Player) {
 ++Player.Properties.Spawns.Value;
});
// * Обработчик смертей. * //
Damage.OnDeath.Add(function(Player) {
 ++player.Properties.Deaths.Value;
});
// * Обработчик убийств. * //
Damage.OnKill.Add(function(Player, Killed) {
 if (Killed.Team != null && Killed.Team != Player.Team) {
	 ++Player.Properties.Kills.Value;
	Player.Properties.Scores.Value += 100;
	}
});

// * Переключения, игровых - режимов. * //
mainTimer.OnTimer.Add(function () {
	switch (StateProp.Value) {
		case WaitingStateValue:
			SetBuildMode();
			break;
		case BuildModeStateValue:
			SetGameMode();
			break;
		case GameStateValue:
			BlueWin();
			break;
		case EndOfMatchStateValue:
			RestartGame();
			break;
	}
});

// * Первое, игровое - состояние. * //
SetWaitingMode();

// * Состояние, игры. * //
function SetWaitingMode() {
	StateProp.Value = WaitingStateValue;
	Ui.GetContext().Hint.Value = "Ожидание, всех - игроков...";
	Spawns.GetContext().enable = false;
	MainTimer.Restart(WaitingPlayersTime);
}

function SetBuildMode() {
  // * Инициализация, надобности режима. * //
	for (const i = 0; i < CaptureAreas.length; ++i) {
	// * Визуализатор, зон - захвата. //
	const CaptureView = CaptureViews[i];
	 CaptureView.Area = CaptureAreas[i];
	 CaptureView.Color = UnCapturedColor;
	 CaptureView.Enable = i === 0;
	// * Триггер, зоны - захвата. * //
	const CaptureTrigger = CaptureTriggers[i];
	 CaptureTrigger.Area = CaptureAreas[i];
	 CaptureTrigger.Enable = true;
	//CaptureTrigger.OnEnter.Add(LogTrigger);
	 // * Свойство, зон - захвата. * //
       const prop = CaptureProperties[i];
	  prop.Value = 0;
	}

	StateProp.Value = BuildModeStateValue;
	Ui.GetContext().Hint.Value = TeamSelectionHint;
	BlueTeam.Ui.Hint.Value = BlueBuildTriggerDefHint;
	RedTeam.Ui.Hint.Value = RedWaitingBlueBuildTriggerHint;

	BlueTeam.Inventory.Main.Value = false;
	BlueTeam.Inventory.Secondary.Value = false;
	BlueTeam.Inventory.Melee.Value = true;
	BlueTeam.Inventory.Explosive.Value = false;
	BlueTeam.Inventory.Build.Value = true;
	BlueTeam.Inventory.BuildInfinity.Value = true;

	RedTeam.Inventory.Main.Value = false;
	RedTeam.Inventory.Secondary.Value = false;
	RedTeam.Inventory.Melee.Value = false;
	RedTeam.Inventory.Explosive.Value = false;
	RedTeam.Inventory.Build.Value = false;

	MainTimer.Restart(BuildBaseTime);
	Spawns.GetContext().Enable = true;
	SpawnTeams();
}
function SetGameMode() {
	StateProp.Value = GameStateValue;
	BlueTeam.Ui.Hint.Value = DefBlueTriggerHint;
	RedTeam.Ui.Hint.Value = RedDefCaptureZoneHint;

	BlueTeam.Inventory.Main.Value = true;
	BlueTeam.Inventory.MainInfinity.Value = true;
	BlueTeam.Inventory.Secondary.Value = true;
	BlueTeam.Inventory.SecondaryInfinity.Value = true;
	BlueTeam.Inventory.Melee.Value = true;
	BlueTeam.Inventory.Explosive.Value = true;
	BlueTeam.Inventory.Build.Value = true;

	RedTeam.Inventory.Main.Value = true;
	RedTeam.Inventory.Secondary.Value = true;
	RedTeam.Inventory.Melee.Value = true;
	RedTeam.Inventory.Explosive.Value = true;
	RedTeam.Inventory.Build.Value = true;

        MainTimer.Restart(GameModeTime);
	DefTickTimer.RestartLoop(DefTimerTickInderval);
	Spawns.GetContext().Despawn();
	SpawnTeams();
}
function BlueWin() {
	StateProp.Value = EndOfMatchStateValue;
	BlueTeam.Properties.Scores.Value += 10000;
	Ui.GetContext().Hint.Value = 'Конец, матча - победила команда: синия!';

	var spawns = Spawns.GetContext();
	spawns.Enable = false;
	spawns.Despawn();
	
	Game.GameOver(BlueTeam);
	MainTimer.Restart(EndOfMatchTime);
}
function RedWin() {
	StateProp.Value = EndOfMatchStateValue;
	RedTeam.Properties.Scores.Value += 10000;
	Ui.GetContext().Hint.Value = 'Конец, матча - победила команда: красная!';

	var spawns = Spawns.GetContext();
	spawns.Enable = false;
	spawns.Despawn();
	
	Game.GameOver(RedTeam);
	mainTimer.Restart(EndOfMatchTime);
}
function RestartGame() {
	Game.RestartGame();
}

function SpawnTeams() {
	for (const team of Teams)
		Spawns.GetContext(team).Spawn();
}

} catch (e) {
   Players.All.forEach(msg => {
msg.Show(`${e.name}: ${e.message} ${e.stack}`);
   });
}




